import logging
from dataclasses import dataclass
import polars as pl
import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table
from fmu.datamodels import ErtDistribution
from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import (
    NoDataError,
    InvalidDataError,
    ServiceRequestError,
    Service,
    MultipleDataMatchesError,
)

from .sumo_client_factory import create_sumo_client
from .parameter_types import (
    EnsembleParameter,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    SensitivityType,
)

LOGGER = logging.getLogger(__name__)


@dataclass
class ParameterMetadata:
    name: str
    distribution: ErtDistribution
    group_name: str | None
    min_value: float | None
    max_value: float | None


class ParameterAccess:
    """Access class for retrieving parameters and sensitivities from SUMO.

    This class provides methods to fetch and transform parameter data from SUMO,
    supporting both standard and custom result formats.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str) -> None:
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "ParameterAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_parameters_and_sensitivities_async(self) -> tuple[list[EnsembleParameter], list[EnsembleSensitivity]]:
        """Retrieve parameters and sensitivities for an ensemble.

        Returns:
            A tuple containing:
            - List of ensemble parameters with metadata and values
            - List of ensemble sensitivities derived from parameters

        Raises:
            MultipleDataMatchesError: If multiple parameter tables are found
            NoDataError: If no parameters are found
            ServiceRequestError: If parameter aggregation fails
            InvalidDataError: If data format is unexpected
        """

        parameter_context = self._ensemble_context.filter(standard_result="parameters")
        table_count = await parameter_context.length_async()
        if table_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple Standard result parameter tables found for case {self._case_uuid} and ensemble {self._ensemble_name}. "
                "This is not supported.",
                Service.SUMO,
            )
        if table_count == 0:
            LOGGER.debug(
                f"No Standard result parameter table found for case {self._case_uuid} and ensemble {self._ensemble_name}. "
                "Attempting custom parameter retrieval."
            )
            ensemble_parameters = await self.get_parameters_from_custom_result_async()
        else:
            ensemble_parameters = await self.get_parameters_from_standard_result_async(parameter_context)

        sensitivities = create_ensemble_sensitivities(ensemble_parameters)

        return ensemble_parameters, sensitivities

    async def get_parameters_from_standard_result_async(
        self, parameter_context: SearchContext
    ) -> list[EnsembleParameter]:
        """Retrieve parameters for an ensemble using standard result format.

        Returns:
            List of EnsembleParameter objects
        """
        perf_metrics = PerfMetrics()

        parameter_table_obj = await parameter_context.getitem_async(0)
        table = await parameter_table_obj.to_arrow_async()
        perf_metrics.record_lap("to_arrow")

        ensemble_parameters = parameter_table_to_ensemble_parameters(table)
        perf_metrics.record_lap("transform")

        LOGGER.debug(
            f"ParameterAccess.get_parameters_from_standard_result_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}"
        )

        return ensemble_parameters

    async def get_parameters_from_custom_result_async(self) -> list[EnsembleParameter]:
        """Retrieve parameters for an ensemble using legacy custom result aggregation.

        This method is used as a fallback when standard result parameters are not available.
        It aggregates per-realization parameters.

        Returns:
            List of EnsembleParameter objects

        Raises:
            NoDataError: If no per-realization parameters exist
            ServiceRequestError: If parameter aggregation fails
            InvalidDataError: If aggregation returns unexpected object type
        """
        perf_metrics = PerfMetrics()

        #  Check for existing per realization parameters before aggregation request
        parameter_realization_context = self._ensemble_context.filter(
            realization=True,
            aggregation=False,
        ).parameters

        realization_count = await parameter_realization_context.length_async()
        if realization_count == 0:
            raise NoDataError(
                f"No parameters found for case {self._case_uuid} and ensemble {self._ensemble_name}",
                Service.SUMO,
            )

        # Aggregate all parameters or use existing aggregation (handled by fmu-sumo)
        parameter_table_context = self._ensemble_context.parameters
        try:
            parameter_agg = await parameter_table_context.aggregation_async(operation="collection")
        except Exception as exp:
            raise ServiceRequestError(
                f"Parameter aggregation failed for case {self._case_uuid} and ensemble {self._ensemble_name}",
                Service.SUMO,
            ) from exp
        perf_metrics.record_lap("aggregate")

        if not isinstance(parameter_agg, Table):
            raise InvalidDataError("Did not get expected object type of Table for parameter aggregation", Service.SUMO)

        parameter_table = await parameter_agg.to_arrow_async()
        perf_metrics.record_lap("to_arrow")

        ensemble_parameters = parameter_table_to_ensemble_parameters_custom_result(parameter_table)
        perf_metrics.record_lap("transform")

        LOGGER.debug(
            f"ParameterAccess.get_parameters_from_custom_result_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}"
        )

        return ensemble_parameters


def create_ensemble_sensitivities(
    sumo_ensemble_parameters: list[EnsembleParameter],
) -> list[EnsembleSensitivity]:
    """Extract sensitivities from ensemble parameters.

    Identifies SENSNAME and SENSCASE parameters and groups them to create
    sensitivity definitions with their associated realizations.

    Args:
        sumo_ensemble_parameters: List of ensemble parameters to extract sensitivities from

    Returns:
        List of ensemble sensitivities, empty if no sensitivity parameters found
    """
    sens_name_parameter = next(
        (param for param in sumo_ensemble_parameters if param.name == "SENSNAME"),
        None,
    )
    sens_case_parameter = next(
        (param for param in sumo_ensemble_parameters if param.name == "SENSCASE"),
        None,
    )
    if sens_case_parameter is None or sens_name_parameter is None:
        return []

    sensitivities_df = pl.DataFrame(
        {
            "name": sens_name_parameter.values,
            "case": sens_case_parameter.values,
            "REAL": sens_case_parameter.realizations,
        }
    )

    # Group by sensitivity name and case to get unique realizations
    per_sensitivity_df = sensitivities_df.group_by("name", "case").agg(pl.col("REAL").unique().alias("realizations"))

    # Assemble ensemble sensitivities
    sensitivities = []
    for (sens_name,), sens_df in per_sensitivity_df.group_by("name"):
        sens_type = find_sensitivity_type_from_case_names(sens_df["case"].unique().to_numpy().tolist())
        sensitivity_cases: list[EnsembleSensitivityCase] = []
        for (case_name,), case_df in sens_df.group_by("case"):
            sensitivity_cases.append(
                EnsembleSensitivityCase(name=case_name, realizations=case_df["realizations"].item())
            )
        sensitivities.append(
            EnsembleSensitivity(
                name=sens_name,
                type=sens_type,
                cases=sensitivity_cases,
            )
        )
    return sensitivities


def find_sensitivity_type_from_case_names(sens_case_names: list[str]) -> SensitivityType:
    """Determine the sensitivity type based on case names.

    Args:
        sens_case_names: List of sensitivity case names

    Returns:
        MONTECARLO if single case named 'p10_p90', otherwise SCENARIO
    """
    if len(sens_case_names) == 1 and sens_case_names[0] == "p10_p90":
        return SensitivityType.MONTECARLO
    return SensitivityType.SCENARIO


def _validate_parameter_table(parameter_table: pa.Table) -> None:
    """Validate that parameter table contains required REAL column.

    Args:
        parameter_table: PyArrow table to validate

    Raises:
        InvalidDataError: If REAL column is missing
    """
    if "REAL" not in parameter_table.column_names:
        raise InvalidDataError(
            "Parameter table does not contain a 'REAL' column, which is required to identify realizations.",
            Service.SUMO,
        )


def parameter_table_to_ensemble_parameters(parameter_table: pa.Table) -> list[EnsembleParameter]:
    """Convert a PyArrow parameter table to EnsembleParameters.

    Args:
        parameter_table: PyArrow table containing parameter data with 'REAL' column

    Returns:
        List of EnsembleParameter objects with metadata and values
    """
    _validate_parameter_table(parameter_table)
    parameter_table = _cast_datetime_columns_to_string(parameter_table)
    ensemble_parameters: list[EnsembleParameter] = []
    for field in parameter_table.schema:
        if field.name != "REAL":
            ensemble_parameters.append(create_ensemble_parameter_from_standard_result(field.name, parameter_table))
    return ensemble_parameters


def create_ensemble_parameter_from_standard_result(
    parameter_name: str,
    parameter_table: pa.Table,
) -> EnsembleParameter:
    """Create an EnsembleParameter from standard result parameter table.

    Args:
        parameter_name: Name of the parameter to extract
        parameter_table: PyArrow table containing parameter data
    Returns:
        Constructed EnsembleParameter with metadata and values
    """

    field = parameter_table.schema.field(parameter_name)
    parameter_meta = get_parameter_metadata_from_field(field)
    column = parameter_table[parameter_name]
    return EnsembleParameter(
        name=parameter_name,
        group_name=parameter_meta.group_name,
        is_logarithmic=is_logarithmic_distribution(parameter_meta.distribution),
        is_discrete=is_discrete_column(field.type, parameter_meta.distribution),
        is_constant=len(set(column)) == 1,
        descriptive_name=parameter_name,
        values=column.to_numpy().tolist(),
        realizations=parameter_table["REAL"].to_numpy().tolist(),
    )


def get_parameter_metadata_from_field(field: pa.Field) -> ParameterMetadata:
    """Extract parameter metadata from a PyArrow field.

    Args:
        field: PyArrow field representing a parameter column
    Returns:
        ParameterMetadata object with extracted metadata
    """
    metadata = {k.decode(): v.decode().strip('"') for k, v in field.metadata.items()} if field.metadata else {}
    distribution = get_distribution_type_from_metadata(metadata.get("distribution"))
    if distribution is None:
        raise InvalidDataError(f"Parameter {field.name} is missing a valid distribution type in metadata", Service.SUMO)
    min_value = float(metadata["min"]) if "min" in metadata else None
    max_value = float(metadata["max"]) if "max" in metadata else None
    group_name = metadata.get("group")
    return ParameterMetadata(
        name=field.name,
        distribution=distribution,
        group_name=group_name,
        min_value=min_value,
        max_value=max_value,
    )


def get_distribution_type_from_metadata(distribution_str: str | None) -> ErtDistribution | None:
    """Get the ErtDistribution type from a distribution string.

    Args:
        distribution_str: Distribution string from metadata
    Returns:
        Corresponding ErtDistribution enum value, or None if not recognized
    """
    if distribution_str is None:
        return None
    distribution_str = distribution_str.lower()
    for dist in ErtDistribution:
        if dist.value == distribution_str:
            return dist
    return None


def is_logarithmic_distribution(distribution: ErtDistribution) -> bool:
    return distribution in [ErtDistribution.lognormal, ErtDistribution.logunif]


def is_discrete_column(column_type: pa.DataType, distribution: ErtDistribution) -> bool:
    """Check if a column represents discrete data.

    Discrete parameters are defined as parameters that are either strings or integers,
    or have a distribution type of const or raw.

    Args:
        column_type: PyArrow data type to check
        distribution: ErtDistribution enum value

    Returns:
        True if the column type is discrete (string or integer) or distribution is const/raw

    """
    if distribution in [ErtDistribution.const, ErtDistribution.raw]:
        return True
    return pa.types.is_integer(column_type) or pa.types.is_string(column_type) or pa.types.is_large_string(column_type)


def _cast_datetime_columns_to_string(parameter_table: pa.Table) -> pa.Table:
    """Cast datetime and date columns to string representation.

    Args:
        parameter_table: PyArrow table with potential datetime columns

    Returns:
        Modified table with datetime columns converted to strings
    """
    for i, field in enumerate(parameter_table.schema):
        if pa.types.is_timestamp(field.type) or pa.types.is_date(field.type):
            parameter_table = parameter_table.set_column(i, field.name, parameter_table[field.name].cast(pa.string()))
    return parameter_table


def parameter_table_to_ensemble_parameters_custom_result(parameter_table: pa.Table) -> list[EnsembleParameter]:
    """Convert a custom result parameter table to EnsembleParameters.

    Handles the legacy format where parameters are stored with group prefixes (GROUP:PARAM)
    and LOG10_ group variants for logarithmic parameters.

    Args:
        parameter_table: PyArrow table containing parameter data

    Returns:
        List of EnsembleParameter objects
    """
    _validate_parameter_table(parameter_table)
    parameter_table = _cast_datetime_columns_to_string(parameter_table)

    parameter_str_arr = [param_str for param_str in parameter_table.column_names if param_str != "REAL"]
    parameter_group_dict = _parameter_str_arr_to_parameter_group_dict(parameter_str_arr)
    ensemble_parameters: list[EnsembleParameter] = []
    for group_name, parameter_names in parameter_group_dict.items():
        if group_name and "LOG10_" in group_name:
            continue
        for parameter_name in parameter_names:
            ensemble_parameters.append(
                _create_ensemble_parameter_from_custom_result(
                    parameter_name, group_name, parameter_group_dict, parameter_table
                )
            )
    return ensemble_parameters


def _create_ensemble_parameter_from_custom_result(
    parameter_name: str,
    group_name: str | None,
    parameter_group_dict: dict[str | None, list[str]],
    parameter_table: pa.Table,
) -> EnsembleParameter:
    """Create an EnsembleParameter from parameter table data.

    Args:
        parameter_name: Name of the parameter
        group_name: Optional group name for the parameter
        parameter_group_dict: Dictionary mapping group names to parameter lists
        parameter_table: PyArrow table containing the parameter values

    Returns:
        Constructed EnsembleParameter with metadata and values
    """
    is_logarithmic = parameter_name in parameter_group_dict.get(f"LOG10_{group_name}", [])
    table_column_name = _parameter_name_and_group_name_to_parameter_str(parameter_name, group_name)
    return EnsembleParameter(
        name=parameter_name,
        group_name=f"LOG10_{group_name}" if is_logarithmic else group_name,
        is_logarithmic=is_logarithmic,
        is_discrete=_is_discrete_column_custom_result(parameter_table.schema.field(table_column_name).type),
        is_constant=len(set(parameter_table[table_column_name])) == 1,
        descriptive_name=parameter_name,
        values=parameter_table[table_column_name].to_numpy().tolist(),
        realizations=parameter_table["REAL"].to_numpy().tolist(),
    )


def _is_discrete_column_custom_result(column_type: pa.DataType) -> bool:
    """Check if a column represents discrete data.

    Discrete parameters are defined as parameters that are either strings or integers.

    Args:
        column_type: PyArrow data type to check

    Returns:
        True if the column type is discrete (string or integer)
    """
    return pa.types.is_integer(column_type) or pa.types.is_string(column_type) or pa.types.is_large_string(column_type)


def _parameter_name_and_group_name_to_parameter_str(parameter_name: str, group_name: str | None) -> str:
    """Convert a parameter name and group name to a parameter string.

    Args:
        parameter_name: Name of the parameter
        group_name: Optional group name

    Returns:
        'GROUP:PARAM' if group exists, otherwise just 'PARAM'
    """
    return f"{group_name}:{parameter_name}" if group_name else parameter_name


def _parameter_str_arr_to_parameter_group_dict(parameter_str_arr: list[str]) -> dict[str | None, list[str]]:
    """Convert a list of parameter strings to a dictionary of parameter groups.

    Parses parameter strings in format 'GROUP:PARAM' or 'PARAM' and groups
    them by their group name (or None if ungrouped).

    Args:
        parameter_str_arr: List of parameter strings to parse

    Returns:
        Dictionary mapping group names (or None) to lists of parameter names

    Raises:
        InvalidDataError: If a parameter string has more than one colon
    """
    parameter_group_dict: dict[str | None, list[str]] = {}
    for parameter_str in parameter_str_arr:
        parameter_name_components = parameter_str.split(":")
        if len(parameter_name_components) > 2:
            raise InvalidDataError(
                f"Parameter {parameter_str} has too many components. Expected <groupname>:<parametername>",
                Service.SUMO,
            )
        if len(parameter_name_components) == 1:
            parameter_name = parameter_name_components[0]
            group_name = None
        else:
            group_name = parameter_name_components[0]
            parameter_name = parameter_name_components[1]
        if group_name not in parameter_group_dict:
            parameter_group_dict[group_name] = []
        parameter_group_dict[group_name].append(parameter_name)
    return parameter_group_dict
