import logging
from io import BytesIO
from typing import List, Optional

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import Case

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ._helpers import create_sumo_client, create_sumo_case_async
from .parameter_types import (
    EnsembleParameter,
    EnsembleParameters,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    SensitivityType,
)

LOGGER = logging.getLogger(__name__)


class ParameterAccess:
    def __init__(self, case: Case, iteration_name: str):
        self._case: Case = case
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "ParameterAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return ParameterAccess(case=case, iteration_name=iteration_name)

    async def get_parameters_and_sensitivities(self) -> EnsembleParameters:
        """Retrieve parameters for an ensemble"""
        timer = PerfTimer()

        table_collection = self._case.tables.filter(
            iteration=self._iteration_name,
            aggregation="collection",
            name="parameters",
            tagname="all",
        )
        if await table_collection.length_async() == 0:
            raise ValueError(f"No parameter tables found {self._case.name, self._iteration_name}")
        if await table_collection.length_async() > 1:
            raise ValueError(f"Multiple parameter tables found {self._case.name,self._iteration_name}")

        table = await table_collection.getitem_async(0)
        byte_stream: BytesIO = await table.blob_async
        table = pq.read_table(byte_stream)

        et_download_arrow_table_ms = timer.lap_ms()
        LOGGER.debug(f"Downloaded arrow table in {et_download_arrow_table_ms}ms")

        ensemble_parameters = parameter_table_to_ensemble_parameters(table)
        sensitivities = create_ensemble_sensitivities(ensemble_parameters)

        return EnsembleParameters(
            parameters=ensemble_parameters,
            sensitivities=sensitivities,
        )

    async def get_parameter(self, parameter_name: str) -> EnsembleParameter:
        """Retrieve a single parameter for an ensemble"""
        parameters = await self.get_parameters_and_sensitivities()
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
    """Convert a parameter table to an EnsembleParameter"""
    ensemble_parameters: List[EnsembleParameter] = []
    for column_name in parameter_table.column_names:
        if column_name == "REAL":
            continue
        parameter_name_components = column_name.split(":")
        if len(parameter_name_components) > 2:
            raise ValueError(f"Parameter {column_name} has too many componenents. Expected <groupname>:<parametername>")
        if len(parameter_name_components) == 1:
            parameter_name = column_name
            group_name = None
        else:
            group_name = parameter_name_components[0]
            parameter_name = parameter_name_components[1]
        ensemble_parameters.append(
            EnsembleParameter(
                name=parameter_name,
                is_logarithmic=column_name.startswith("LOG10_"),
                is_numerical=parameter_table.schema.field(column_name).type != pa.string,
                is_constant=len(set(parameter_table[column_name])) == 1,
                group_name=group_name,
                descriptive_name=parameter_name,
                values=parameter_table[column_name].to_numpy().tolist(),
                realizations=parameter_table["REAL"].to_numpy().tolist(),
            )
        )
    return ensemble_parameters
