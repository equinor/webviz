import logging
from typing import List, Optional

import pandas as pd
import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import InvalidDataError, ServiceRequestError, Service

from .sumo_client_factory import create_sumo_client
from .parameter_types import (
    EnsembleParameter,
    EnsembleParameters,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    SensitivityType,
)

LOGGER = logging.getLogger(__name__)


class ParameterAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "ParameterAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_parameters_and_sensitivities_async(self) -> EnsembleParameters:
        """Retrieve parameters for an ensemble"""
        perf_metrics = PerfMetrics()

        parameter_table_context = self._ensemble_context.parameters
        try:
            parameter_agg = await parameter_table_context.aggregation_async(operation="collection")
        except Exception as exp:
            raise ServiceRequestError(
                f"No parameters found for case {self._case_uuid} and iteration {self._iteration_name}",
                Service.SUMO,
            ) from exp
        perf_metrics.record_lap("aggregate")

        parameter_table = await parameter_agg.to_arrow_async()
        perf_metrics.record_lap("to_arrow")

        ensemble_parameters = parameter_table_to_ensemble_parameters(parameter_table)
        sensitivities = create_ensemble_sensitivities(ensemble_parameters)
        perf_metrics.record_lap("transform")

        LOGGER.debug(
            f"ParameterAccess.get_parameters_and_sensitivities_async() took: {perf_metrics.to_string()}, {self._case_uuid=}, {self._iteration_name=}"
        )

        return EnsembleParameters(
            parameters=ensemble_parameters,
            sensitivities=sensitivities,
        )

    async def get_parameter_async(self, parameter_name: str) -> EnsembleParameter:
        """Retrieve a single parameter for an ensemble"""
        parameters = await self.get_parameters_and_sensitivities_async()
        return next(parameter for parameter in parameters.parameters if parameter.name == parameter_name)


def create_ensemble_sensitivities(
    sumo_ensemble_parameters: List[EnsembleParameter],
) -> Optional[List[EnsembleSensitivity]]:
    """Extract sensitivities from a list of SumoEnsembleParameter objects"""
    sensitivities = []

    sens_name_parameter = next(
        (parameter for parameter in sumo_ensemble_parameters if parameter.name == "SENSNAME"),
        None,
    )
    sens_case_parameter = next(
        (parameter for parameter in sumo_ensemble_parameters if parameter.name == "SENSCASE"),
        None,
    )
    if sens_case_parameter is None or sens_name_parameter is None:
        return None
    df = pd.DataFrame(
        {
            "name": sens_name_parameter.values,
            "case": sens_case_parameter.values,
            "REAL": sens_case_parameter.realizations,
        }
    )
    for name, group in df.groupby("name"):
        sensitivities.append(
            EnsembleSensitivity(
                name=name,
                type=find_sensitivity_type(list(group["case"].unique())),
                cases=create_ensemble_sensitivity_cases(group),
            )
        )
    return sensitivities if sensitivities else None


def find_sensitivity_type(sens_case_names: List[str]) -> SensitivityType:
    """Find the sensitivity type based on the sensitivity case names"""
    if len(sens_case_names) == 1 and sens_case_names[0] == "p10_p90":
        return SensitivityType.MONTECARLO
    return SensitivityType.SCENARIO


def create_ensemble_sensitivity_cases(
    df: pd.DataFrame,
) -> List[EnsembleSensitivityCase]:
    """Create a list of EnsembleSensitivityCase objects from a dataframe"""
    cases = []
    for case_name, case_df in df.groupby("case"):
        cases.append(
            EnsembleSensitivityCase(
                name=case_name,
                realizations=case_df["REAL"].unique().tolist(),
            )
        )
    return cases


def parameter_table_to_ensemble_parameters(parameter_table: pa.Table) -> List[EnsembleParameter]:
    """Convert a parameter table to EnsembleParameters"""
    ensemble_parameters: List[EnsembleParameter] = []
    if "REAL" not in parameter_table.column_names:
        raise InvalidDataError(
            "Parameter table does not contain a 'REAL' column, which is required to identify realizations.",
            Service.SUMO,
        )
    parameter_str_arr = [param_str for param_str in parameter_table.column_names if param_str != "REAL"]
    parameter_group_dict = _parameter_str_arr_to_parameter_group_dict(parameter_str_arr)
    ensemble_parameters = []
    for group_name, parameter_names in parameter_group_dict.items():
        if group_name and "LOG10_" in group_name:
            continue
        for parameter_name in parameter_names:
            is_logarithmic = parameter_name in parameter_group_dict.get(f"LOG10_{group_name}", [])
            table_column_name = _parameter_name_and_group_name_to_parameter_str(parameter_name, group_name)
            ensemble_parameters.append(
                EnsembleParameter(
                    name=parameter_name,
                    group_name=f"LOG10_{group_name}" if is_logarithmic else group_name,
                    is_logarithmic=is_logarithmic,
                    is_discrete=_is_discrete_column(parameter_table.schema.field(table_column_name).type),
                    is_constant=len(set(parameter_table[table_column_name])) == 1,
                    descriptive_name=parameter_name,
                    values=parameter_table[table_column_name].to_numpy().tolist(),
                    realizations=parameter_table["REAL"].to_numpy().tolist(),
                )
            )
    return ensemble_parameters


def _is_discrete_column(column_type: pa.DataType) -> bool:
    """Check if a column is discrete

    Discrete parameter is defined as a parameter that is either a string or an integer
    """
    return (
        column_type == pa.string()
        or column_type == pa.int64()
        or column_type == pa.int32()
        or column_type == pa.int16()
        or column_type == pa.int8()
    )


def _parameter_name_and_group_name_to_parameter_str(parameter_name: str, group_name: Optional[str]) -> str:
    """Convert a parameter name and group name to a parameter string"""
    return f"{group_name}:{parameter_name}" if group_name else parameter_name


def _parameter_str_arr_to_parameter_group_dict(parameter_str_arr: List[str]) -> dict:
    """Convert a list of parameter strings to a dictionary of parameter groups"""
    parameter_group_dict: dict = {}
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
