from enum import Enum
from io import BytesIO
from typing import List, Optional, Sequence, Union, Dict
import logging

import numpy as np
from pydantic import BaseModel
import pandas as pd
from fmu.sumo.explorer.explorer import CaseCollection, SumoClient
from fmu.sumo.explorer import AggregatedTable

# from fmu.sumo.explorer.objects.table import AggregatedTable

from src.services.utils.perf_timer import PerfTimer
from ._helpers import create_sumo_client_instance

LOGGER = logging.getLogger(__name__)


class EnsembleParameter(BaseModel):
    name: str
    is_logarithmic: bool
    is_numerical: bool
    group_name: Optional[str]
    descriptive_name: Optional[str]
    realizations: List[int]
    values: List[Union[str, int, float]]


class EnsembleSensitivityCase(BaseModel):
    name: str
    realizations: List[int]


class EnsembleSensitivity(BaseModel):
    name: str
    type: str
    cases: List[EnsembleSensitivityCase]


class SENSITIVITY_TYPES(str, Enum):
    MONTECARLO = "montecarlo"
    SCENARIO = "scenario"


class ParameterAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self.case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(self.case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

    def get_parameters(self) -> List[EnsembleParameter]:
        """Retrieve parameters for an ensemble"""
        case = self.case_collection[0]
        # Parameters are attached to any data object, but currently only accessible with the explorer by downloading a table
        random_table_that_has_parameters = AggregatedTable(case, "summary", "eclipse", "iter-0")

        parameters_dict: Dict[Dict[str, Union[str, Dict[str, str]]]] = random_table_that_has_parameters.parameters
        ensemble_parameters = self._untangle_parameters(parameters_dict)
        sanitized_ensemble_parameters = self._sanitize_parameters(ensemble_parameters)
        return sanitized_ensemble_parameters

    def _untangle_parameters(self, parameters_dict: Dict[str, Union[str, Dict[str, str]]]):
        # The parameters are stored in a nested dictionary, where the first level should be the parameter group name.
        # Problem is that only some of the parameters are in a group, and some are not.
        # Find parameters that are in a group
        parameter_group_names = []
        for parameter_or_group_name, possible_parameter_group in parameters_dict.items():
            for value in possible_parameter_group.values():
                if isinstance(value, dict):
                    parameter_group_names.append(parameter_or_group_name)

        ensemble_parameters = []
        # Loop through the parameters and create an EnsembleParameter object for each parameter
        for parameter_group_name, parameter_group_obj in parameters_dict.items():
            # If grouped parameters, loop through the parameters in the group
            if parameter_group_name in parameter_group_names:
                for parameter_name, parameter_obj in parameter_group_obj.items():
                    ensemble_parameter = EnsembleParameter(
                        name=parameter_name,
                        group_name=parameter_group_name,
                        is_logarithmic=parameter_group_name.startswith("LOG10_"),
                        is_numerical=False,
                        descriptive_name=f"{parameter_name} (log)"
                        if parameter_group_name.startswith("LOG10_")
                        else parameter_name,
                        values=[],
                        realizations=[],
                    )
                    for realization, value in parameter_obj.items():
                        ensemble_parameter.values.append(value)
                        ensemble_parameter.realizations.append(int(realization))

                    ensemble_parameter.is_numerical = is_array_numeric(np.array(ensemble_parameter.values))
                    ensemble_parameters.append(ensemble_parameter)

            else:
                ensemble_parameter = EnsembleParameter(
                    name=parameter_group_name,
                    is_logarithmic=False,
                    is_numerical=False,
                    descriptive_name=parameter_group_name,
                    values=[],
                    realizations=[],
                )
                for realization, value in parameter_group_obj.items():
                    ensemble_parameter.values.append(value)
                    ensemble_parameter.realizations.append(int(realization))
                ensemble_parameter.is_numerical = is_array_numeric(np.array(ensemble_parameter.values))
                ensemble_parameters.append(ensemble_parameter)
        return ensemble_parameters

    def _sanitize_parameters(self, ensemble_parameters: List[EnsembleParameter]):
        """
        - Remove non-log parameters if there is a log parameter with the same name
        """
        sanitized_ensemble_parameters = []
        # Drop non-log parameters if there is a log parameter with the same name
        for ensemble_parameter in ensemble_parameters:
            if not ensemble_parameter.is_logarithmic:
                if ensemble_parameter.name not in [p.name for p in ensemble_parameters if p.is_logarithmic]:
                    sanitized_ensemble_parameters.append(ensemble_parameter)
            else:
                sanitized_ensemble_parameters.append(ensemble_parameter)
        return sanitized_ensemble_parameters

    def get_parameter(self, parameter_name: str) -> EnsembleParameter:
        """Retrieve a single parameter for an ensemble"""
        parameters = self.get_parameters()
        return next(parameter for parameter in parameters if parameter.name == parameter_name)

    def is_sensitivity_run(self) -> bool:
        """Check if the current ensemble is a sensitivity run"""
        parameters = self.get_parameters()
        return any([parameter.name == "SENSNAME" for parameter in parameters])

    def get_sensitivities(self) -> List[EnsembleSensitivity]:
        parameters = self.get_parameters()
        sensname_parameter = next(parameter for parameter in parameters if parameter.name == "SENSNAME")
        senscase_parameter = next(parameter for parameter in parameters if parameter.name == "SENSCASE")
        dframe_sensitivity = pd.DataFrame(
            columns=["Sensitivity", "Realization"], data=zip(sensname_parameter.values, sensname_parameter.realizations)
        )
        dframe_case = pd.DataFrame(
            columns=["Case", "Realization"], data=zip(senscase_parameter.values, senscase_parameter.realizations)
        )
        dframe = pd.merge(dframe_sensitivity, dframe_case, on="Realization")
        dframe["type"] = dframe.apply(
            lambda row: SENSITIVITY_TYPES.MONTECARLO if row["Case"] == "p10_p90" else SENSITIVITY_TYPES.SCENARIO, axis=1
        )
        ensemble_sensitivities = []
        for sensitivity, sensitivity_df in dframe.groupby("Sensitivity"):
            ensemble_sensitivities.append(
                EnsembleSensitivity(
                    name=sensitivity,
                    type=sensitivity_df["type"].iloc[0],
                    cases=[
                        EnsembleSensitivityCase(name=case, realizations=case_df["Realization"].tolist())
                        for case, case_df in sensitivity_df.groupby("Case")
                    ],
                )
            )
        return ensemble_sensitivities


def is_array_numeric(array: np.ndarray) -> bool:
    """Check if an array is numeric"""
    return np.issubdtype(array.dtype, np.number)