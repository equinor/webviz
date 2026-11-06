import asyncio
import logging
import dataclasses
from dataclasses import dataclass, replace
from typing import cast
import polars as pl
import pyarrow as pa
from fmu.datamodels.standard_results.enums import StandardResultName
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
    ServiceLayerException,
)

from ._helpers import create_sumo_case_async
from .ensemble_lineage import MAX_RESTART_CHAIN_DEPTH, RestartAncestor, RestartChain, get_restart_chain_async
from .sumo_client_factory import create_sumo_client
from .parameter_types import (
    EnsembleParameter,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    ParameterSourceEnsemble,
    SensitivityType,
)

LOGGER = logging.getLogger(__name__)

ERT_DESIGN_MATRIX_DOCS_URL = "https://ert.readthedocs.io/en/latest/getting_started/howto/design_matrix.html"
ERT_RUN_TEMPLATE_DOCS_URL = "https://ert.readthedocs.io/en/latest/reference/configuration/keywords.html#run-template"

SENSITIVITY_PARAMETER_NAMES = ("SENSNAME", "SENSCASE")


@dataclass
class ParameterMetadata:
    name: str
    distribution: ErtDistribution
    group_name: str | None
    min_value: float | None
    max_value: float | None


@dataclass
class ParametersAndSensitivities:
    """Parameters and sensitivities for an ensemble, with non-fatal user-facing warnings."""

    parameters: list[EnsembleParameter]
    sensitivities: list[EnsembleSensitivity]
    warnings: list[str] = dataclasses.field(default_factory=list)


class ParameterAccess:
    """Access class for retrieving parameters and sensitivities from SUMO.

    This class provides methods to fetch and transform parameter data from SUMO,
    supporting both standard and legacy result formats.
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

    async def get_parameters_and_sensitivities_async(self) -> ParametersAndSensitivities:
        """Retrieve parameters and sensitivities for an ensemble.

        If the ensemble has standard-result parameters and was restarted from other ensembles, the
        standard-result parameters of those restart ensembles are combined with the ensemble's own.

        Returns:
            A ParametersAndSensitivities object containing:
            - List of ensemble parameters with metadata and values, own parameters first
            - List of ensemble sensitivities derived from the ensemble's own parameters
            - Non-fatal user-facing warnings, e.g. if a restart ensemble could not be found or if
              realization-level parameters are missing from the standard result (e.g. legacy design matrix
              parameters injected into parameters.txt/json)

        Raises:
            MultipleDataMatchesError: If multiple parameter tables are found
            NoDataError: If no parameters are found
            ServiceRequestError: If parameter aggregation fails
            InvalidDataError: If data format is unexpected, or parameters from restart ensembles conflict
        """

        parameter_context = self._ensemble_context.filter(standard_result=StandardResultName.parameters)
        table_count = await parameter_context.length_async()
        if table_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple Standard result parameter tables found for case {self._case_uuid} and ensemble {self._ensemble_name}. "
                "This is not supported.",
                Service.SUMO,
            )

        warnings: list[str] = []
        if table_count == 0:
            LOGGER.debug(
                f"No Standard result parameter table found for case {self._case_uuid} and ensemble {self._ensemble_name}. "
                "Attempting legacy parameter retrieval."
            )
            try:
                async with asyncio.TaskGroup() as tg:
                    legacy_parameters_task = tg.create_task(self._get_parameters_from_legacy_result_async())
                    restart_chain_task = tg.create_task(
                        get_restart_chain_async(self._sumo_client, self._case_uuid, self._ensemble_name)
                    )
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group  # Reraise the first exception

            ensemble_parameters = legacy_parameters_task.result()
            own_parameters = ensemble_parameters
            restart_chain = restart_chain_task.result()
            if restart_chain.ancestors:
                warnings.append(
                    f"This ensemble was restarted from {_ancestor_label(restart_chain.ancestors[0])}, but its "
                    "parameters are not stored as a standard result, so parameters from the restart ensemble were "
                    "not combined."
                )
        else:
            try:
                async with asyncio.TaskGroup() as tg:
                    own_parameters_task = tg.create_task(
                        self._get_parameters_from_standard_result_async(parameter_context)
                    )
                    restart_chain_task = tg.create_task(
                        get_restart_chain_async(self._sumo_client, self._case_uuid, self._ensemble_name)
                    )
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group  # Reraise the first exception

            own_parameters = own_parameters_task.result()
            ensemble_parameters, restart_warnings = await self._combine_with_restart_ancestors_async(
                own_parameters, restart_chain_task.result()
            )
            warnings.extend(restart_warnings)

            non_standard_parameters_warning = await self._detect_parameters_missing_from_standard_result_async(
                own_parameters
            )
            if non_standard_parameters_warning is not None:
                warnings.append(non_standard_parameters_warning)

        # Ancestors' SENSNAME/SENSCASE are verified identical to the child's, so the child's are sufficient
        sensitivities = _create_ensemble_sensitivities(own_parameters)

        return ParametersAndSensitivities(
            parameters=ensemble_parameters,
            sensitivities=sensitivities,
            warnings=warnings,
        )

    async def _combine_with_restart_ancestors_async(
        self, own_parameters: list[EnsembleParameter], restart_chain: RestartChain
    ) -> tuple[list[EnsembleParameter], list[str]]:
        """Merge standard-result parameters from the restart ancestors into the ensemble's own parameters.

        Browser caching of the parameters endpoint is keyed on this ensemble's fingerprint only. That is
        sufficient since Sumo makes an ensemble read-only once other ensembles are restarted from it.
        """
        warnings: list[str] = []

        if restart_chain.unresolved_ensemble_uuid is not None:
            if restart_chain.ancestors:
                warnings.append(
                    f"Restart ensemble {_ancestor_label(restart_chain.ancestors[-1])} was restarted from ensemble "
                    f"{restart_chain.unresolved_ensemble_uuid}, which could not be found in Sumo (deleted or no "
                    "access). Parameters from that ensemble and any earlier ones were not loaded."
                )
            else:
                warnings.append(
                    f"This ensemble was restarted from ensemble {restart_chain.unresolved_ensemble_uuid}, which "
                    "could not be found in Sumo (deleted or no access). Only parameters from the ensemble itself "
                    "are loaded."
                )

        if restart_chain.truncated:
            warnings.append(
                f"The chain of restart ensembles is longer than {MAX_RESTART_CHAIN_DEPTH} ensembles or contains a "
                "cycle. Only parameters from the first "
                f"{len(restart_chain.ancestors)} restart ensemble(s) in the chain were combined."
            )

        if not restart_chain.ancestors:
            return own_parameters, warnings

        perf_metrics = PerfMetrics()
        try:
            async with asyncio.TaskGroup() as tg:
                case_task = tg.create_task(create_sumo_case_async(self._sumo_client, self._case_uuid))
                ancestor_tasks = [
                    (
                        ancestor,
                        tg.create_task(_get_standard_result_parameters_for_ancestor_async(self._sumo_client, ancestor)),
                    )
                    for ancestor in restart_chain.ancestors
                ]
        except* ServiceLayerException as exc_group:
            for exc in exc_group.exceptions:
                raise exc from exc_group  # Reraise the first exception
        perf_metrics.record_lap("load-ancestors")

        ancestors_and_parameters: list[tuple[RestartAncestor, list[EnsembleParameter]]] = []
        for ancestor, task in ancestor_tasks:
            ancestor_parameters = task.result()
            if ancestor_parameters is None:
                warnings.append(
                    f"Restart ensemble {_ancestor_label(ancestor)} has no standard-result parameters; its "
                    "parameters were not combined."
                )
            else:
                ancestors_and_parameters.append((ancestor, ancestor_parameters))

        own_ensemble_label = f"{case_task.result().name}/{self._ensemble_name}"
        merged_parameters, merge_warnings = _merge_restart_parameters(
            own_parameters, ancestors_and_parameters, own_ensemble_label
        )
        warnings.extend(merge_warnings)
        perf_metrics.record_lap("merge")

        LOGGER.debug(
            f"ParameterAccess._combine_with_restart_ancestors_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}, {len(restart_chain.ancestors)=}"
        )

        return merged_parameters, warnings

    async def _detect_parameters_missing_from_standard_result_async(
        self, standard_result_parameters: list[EnsembleParameter]
    ) -> str | None:
        """Detect parameters present on realization level but missing from the standard result.

        With the legacy/old design matrix setup, parameters may be injected into the per-realization
        ``parameters.txt``/``parameters.json`` during the workflow without ERT's knowledge. These do not
        end up in the ERT-managed standard result, and would therefore silently disappear from Webviz.

        To keep this check cheap we only sample a single realization rather than aggregating all of them.
        This is a best-effort, non-fatal check: any failure simply results in no warning.

        Returns:
            A user-facing warning message if realization-level parameters are missing from the standard
            result, otherwise None.
        """
        try:
            realization_parameter_context = self._ensemble_context.filter(
                realization=True,
                aggregation=False,
            ).parameters
            realization_count = await realization_parameter_context.length_async()
            if realization_count == 0:
                return None

            # Per realization the parameters are stored as a Dictionary object (the parameters.json content),
            # not as an aggregated arrow table. Parse it directly to keep the check to a single realization.
            realization_parameter_obj = await realization_parameter_context.getitem_async(0)
            realization_parameter_dict = await realization_parameter_obj.parse_async()

            standard_result_names = {param.name for param in standard_result_parameters}
            realization_parameter_names = _flatten_realization_parameter_names(realization_parameter_dict)

            missing_parameter_names = sorted(realization_parameter_names - standard_result_names)
        except Exception:  # pylint: disable=broad-exception-caught
            LOGGER.exception(
                "Failed to compare realization-level parameters against standard result, skipping warning. "
                f"{self._case_uuid=}, {self._ensemble_name=}"
            )
            return None

        if not missing_parameter_names:
            return None

        return (
            f"{len(missing_parameter_names)} parameter(s) found on a sampled realization are missing from the "
            "ERT-managed parameter set and will not appear in Webviz: "
            f"{', '.join(missing_parameter_names)}. "
            "This typically happens with the old design matrix setup, where parameters are injected into "
            "parameters.txt/json during the workflow without ERT's knowledge. Move to ERT's native design "
            f"matrix support to make all sensitivity parameters appear in Webviz: {ERT_DESIGN_MATRIX_DOCS_URL}"
        )

    async def _get_parameters_from_standard_result_async(
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

        ensemble_parameters = _parameter_table_to_ensemble_parameters(table)
        perf_metrics.record_lap("transform")

        LOGGER.debug(
            f"ParameterAccess._get_parameters_from_standard_result_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}"
        )

        return ensemble_parameters

    async def _get_parameters_from_legacy_result_async(self) -> list[EnsembleParameter]:
        """Retrieve parameters for an ensemble using legacy legacy result aggregation.

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
                f"Ensemble {self._ensemble_name} (case {self._case_uuid}) does not have any parameters stored in Sumo.\n\n"
                "If this is a sensitivity (design matrix) ensemble, the likely cause is that the deprecated "
                "DESIGN2PARAMS and DESIGN_KW are still used in the ERT configuration file, instead of "
                "DESIGN_MATRIX and RUN_TEMPLATE.\n\n"
                "See the ERT documentation on how to migrate:\n"
                f"{ERT_DESIGN_MATRIX_DOCS_URL}\n"
                f"{ERT_RUN_TEMPLATE_DOCS_URL}",
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

        ensemble_parameters = _parameter_table_to_ensemble_parameters_legacy_result(parameter_table)
        perf_metrics.record_lap("transform")

        LOGGER.debug(
            f"ParameterAccess._get_parameters_from_legacy_result_async() took: {perf_metrics.to_string()},"
            f" {self._case_uuid=}, {self._ensemble_name=}"
        )

        return ensemble_parameters


def _ancestor_label(ancestor: RestartAncestor) -> str:
    return f"{ancestor.case_name}/{ancestor.ensemble_name}"


async def _get_standard_result_parameters_for_ancestor_async(
    sumo_client: SumoClient, ancestor: RestartAncestor
) -> list[EnsembleParameter] | None:
    """Load the standard-result parameters of a restart ancestor, or None if it has no standard-result parameters."""
    parameter_context = SearchContext(sumo=sumo_client).filter(
        uuid=ancestor.case_uuid,
        ensemble=ancestor.ensemble_name,
        standard_result=StandardResultName.parameters,
    )
    table_count = await parameter_context.length_async()
    if table_count == 0:
        return None
    if table_count > 1:
        raise MultipleDataMatchesError(
            f"Multiple Standard result parameter tables found for restart ensemble {_ancestor_label(ancestor)}. "
            "This is not supported.",
            Service.SUMO,
        )

    parameter_table_obj = await parameter_context.getitem_async(0)
    table = await parameter_table_obj.to_arrow_async()
    return _parameter_table_to_ensemble_parameters(table)


def _merge_restart_parameters(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[RestartAncestor, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> tuple[list[EnsembleParameter], list[str]]:
    """Combine an ensemble's own parameters with the parameters of its restart ancestors.

    Args:
        own_parameters: The ensemble's own parameters
        ancestors_and_parameters: Restart ancestors with their parameters, nearest parent first
        own_ensemble_label: "<case name>/<ensemble name>" of the ensemble, used in user-facing messages

    Returns:
        The merged parameters (own first, then ancestors nearest first) and non-fatal warnings.
        Ancestor parameters are filtered to the ensemble's realizations and tagged with their source ensemble.
        SENSNAME/SENSCASE are kept once, from the ensemble itself.

    Raises:
        InvalidDataError: If SENSNAME/SENSCASE are not present in all sources or not aligned, or if any
            (name, group) parameter identifier exists in more than one source.
    """
    _verify_sensitivity_parameters_aligned(own_parameters, ancestors_and_parameters, own_ensemble_label)

    ancestors_and_non_sens_parameters = [
        (ancestor, [param for param in parameters if param.name not in SENSITIVITY_PARAMETER_NAMES])
        for ancestor, parameters in ancestors_and_parameters
    ]
    _verify_no_conflicting_parameters(own_parameters, ancestors_and_non_sens_parameters, own_ensemble_label)

    own_realizations = {real for param in own_parameters for real in param.realizations}

    merged_parameters = list(own_parameters)
    warnings: list[str] = []
    for (ancestor, all_ancestor_parameters), (_, ancestor_parameters) in zip(
        ancestors_and_parameters, ancestors_and_non_sens_parameters
    ):
        ancestor_realizations = {real for param in all_ancestor_parameters for real in param.realizations}
        missing_realizations = sorted(own_realizations - ancestor_realizations)
        if missing_realizations:
            warnings.append(
                f"Restart ensemble {_ancestor_label(ancestor)} does not have realization(s) "
                f"{', '.join(str(real) for real in missing_realizations)}; parameters from the restart ensemble "
                "have no values for these realizations."
            )

        source_ensemble = ParameterSourceEnsemble(
            case_uuid=ancestor.case_uuid,
            case_name=ancestor.case_name,
            ensemble_name=ancestor.ensemble_name,
        )
        for param in ancestor_parameters:
            merged_parameters.append(_filter_parameter_to_realizations(param, own_realizations, source_ensemble))

    return merged_parameters, warnings


def _filter_parameter_to_realizations(
    parameter: EnsembleParameter, realizations: set[int], source_ensemble: ParameterSourceEnsemble
) -> EnsembleParameter:
    kept_indices = [idx for idx, real in enumerate(parameter.realizations) if real in realizations]
    filtered_values = cast(list[float] | list[int] | list[str], [parameter.values[idx] for idx in kept_indices])
    return replace(
        parameter,
        realizations=[parameter.realizations[idx] for idx in kept_indices],
        values=filtered_values,
        is_constant=len(set(filtered_values)) == 1,
        source_ensemble=source_ensemble,
    )


def _verify_sensitivity_parameters_aligned(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[RestartAncestor, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> None:
    own_sens_parameters = _get_sensitivity_parameters_by_name(own_parameters)

    error_messages: list[str] = []
    for ancestor, ancestor_parameters in ancestors_and_parameters:
        ancestor_label = _ancestor_label(ancestor)
        ancestor_sens_parameters = _get_sensitivity_parameters_by_name(ancestor_parameters)

        problems: list[str] = []
        for sens_name in SENSITIVITY_PARAMETER_NAMES:
            own_param = own_sens_parameters.get(sens_name)
            ancestor_param = ancestor_sens_parameters.get(sens_name)
            if own_param is not None and ancestor_param is None:
                problems.append(f"{sens_name} is missing in {ancestor_label}")
            elif own_param is None and ancestor_param is not None:
                problems.append(f"{sens_name} is missing in {own_ensemble_label}")
            elif own_param is not None and ancestor_param is not None:
                ancestor_values_by_real = dict(zip(ancestor_param.realizations, ancestor_param.values))
                differing_count = sum(
                    1
                    for real, value in zip(own_param.realizations, own_param.values)
                    if real in ancestor_values_by_real and ancestor_values_by_real[real] != value
                )
                if differing_count > 0:
                    problems.append(f"{sens_name} differs on {differing_count} realization(s)")

        if problems:
            error_messages.append(
                f"Sensitivity parameters (SENSNAME/SENSCASE) differ between {own_ensemble_label} and restart "
                f"ensemble {ancestor_label}: {'; '.join(problems)}."
            )

    if error_messages:
        raise InvalidDataError("\n".join(error_messages), Service.SUMO)


def _get_sensitivity_parameters_by_name(parameters: list[EnsembleParameter]) -> dict[str, EnsembleParameter]:
    sens_parameters: dict[str, EnsembleParameter] = {}
    for param in parameters:
        if param.name in SENSITIVITY_PARAMETER_NAMES and param.name not in sens_parameters:
            sens_parameters[param.name] = param
    return sens_parameters


def _verify_no_conflicting_parameters(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[RestartAncestor, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> None:
    labelled_sources: list[tuple[str, list[EnsembleParameter]]] = [(own_ensemble_label, own_parameters)]
    labelled_sources.extend(
        (_ancestor_label(ancestor), parameters) for ancestor, parameters in ancestors_and_parameters
    )

    source_labels_by_ident: dict[tuple[str, str | None], list[str]] = {}
    for label, parameters in labelled_sources:
        for ident in dict.fromkeys((param.name, param.group_name) for param in parameters):
            source_labels_by_ident.setdefault(ident, []).append(label)

    conflicting_idents_by_sources: dict[tuple[str, ...], list[str]] = {}
    for (name, group_name), labels in source_labels_by_ident.items():
        if len(labels) > 1:
            ident_str = f"{group_name}/{name}" if group_name else name
            conflicting_idents_by_sources.setdefault(tuple(labels), []).append(ident_str)

    if not conflicting_idents_by_sources:
        return

    conflict_descriptions = [
        f"parameter(s) {', '.join(idents)} exist in {_describe_sources(list(labels))}"
        for labels, idents in conflicting_idents_by_sources.items()
    ]
    raise InvalidDataError(
        f"Cannot combine parameters from restart ensembles: {'; '.join(conflict_descriptions)}. "
        "Rename or remove the duplicates.",
        Service.SUMO,
    )


def _describe_sources(labels: list[str]) -> str:
    if len(labels) == 2:
        return f"both {labels[0]} and {labels[1]}"
    return f"all of {', '.join(labels[:-1])} and {labels[-1]}"


def _create_ensemble_sensitivities(
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
        sens_type = _find_sensitivity_type_from_case_names(sens_df["case"].unique().to_numpy().tolist())
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


def _find_sensitivity_type_from_case_names(sens_case_names: list[str]) -> SensitivityType:
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


def _parameter_table_to_ensemble_parameters(parameter_table: pa.Table) -> list[EnsembleParameter]:
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
        is_logarithmic=_is_logarithmic_distribution(parameter_meta.distribution),
        is_discrete=_is_discrete_distribution(parameter_meta.distribution),
        is_numerical=_is_numerical_column(field.type),
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
    distribution = _get_distribution_type_from_distribution_string(metadata.get("distribution"))
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


def _get_distribution_type_from_distribution_string(distribution_str: str | None) -> ErtDistribution | None:
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


def _is_logarithmic_distribution(distribution: ErtDistribution) -> bool:
    return distribution in [ErtDistribution.lognormal, ErtDistribution.logunif]


def _is_discrete_distribution(distribution: ErtDistribution) -> bool:
    """Check if a distribution is discrete.

    Discrete parameters are identified from non-continuous ERT distributions.
    The current rule tags DERRF, DUNIF, and RAW distributions as discrete.

    Args:
        distribution: ErtDistribution enum value

    Returns:
        True if the distribution is tagged as discrete

    """
    if distribution in [ErtDistribution.derrf, ErtDistribution.dunif, ErtDistribution.raw]:
        return True
    return False


def _is_numerical_column(column_type: pa.DataType) -> bool:
    """Check if a column represents numerical data."""
    return pa.types.is_integer(column_type) or pa.types.is_floating(column_type)


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


def _parameter_table_to_ensemble_parameters_legacy_result(parameter_table: pa.Table) -> list[EnsembleParameter]:
    """Convert a legacy result parameter table to EnsembleParameters.

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
                _create_ensemble_parameter_from_legacy_result(
                    parameter_name, group_name, parameter_group_dict, parameter_table
                )
            )
    return ensemble_parameters


def _create_ensemble_parameter_from_legacy_result(
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
        is_discrete=_is_discrete_column_legacy_result(parameter_table.schema.field(table_column_name).type),
        is_numerical=_is_numerical_column(parameter_table.schema.field(table_column_name).type),
        is_constant=len(set(parameter_table[table_column_name])) == 1,
        descriptive_name=parameter_name,
        values=parameter_table[table_column_name].to_numpy().tolist(),
        realizations=parameter_table["REAL"].to_numpy().tolist(),
    )


def _is_discrete_column_legacy_result(column_type: pa.DataType) -> bool:
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


def _flatten_realization_parameter_names(realization_parameter_dict: dict) -> set[str]:
    """Collect the bare parameter names from a per-realization parameters.json dictionary.

    The parameters.json content can be nested by group (``{GROUP: {PARAM: value}}``) or flat with
    colon-prefixed keys (``{"GROUP:PARAM": value}``) or ungrouped (``{PARAM: value}``). In all cases the
    bare parameter name (without group prefix) is returned, matching how standard result parameters are
    named. Parameters belonging to LOG10_ groups are skipped, mirroring the handling of the aggregated
    legacy parameter table.

    Args:
        realization_parameter_dict: Parsed parameters.json content for a single realization

    Returns:
        Set of bare parameter names (without group prefix)
    """
    parameter_names: set[str] = set()
    for key, value in realization_parameter_dict.items():
        if isinstance(value, dict):
            # Nested format: {GROUP: {PARAM: value}}
            if "LOG10_" in key:
                continue
            parameter_names.update(value.keys())
        else:
            # Flat format: "GROUP:PARAM" or "PARAM"
            name_components = key.split(":")
            group_name = name_components[0] if len(name_components) == 2 else None
            if group_name and "LOG10_" in group_name:
                continue
            parameter_names.add(name_components[-1])
    return parameter_names


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
