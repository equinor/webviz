from typing import List, Optional, Union, Dict
import logging

from pydantic import BaseModel
from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from ..utils.perf_timer import PerfTimer
from ._helpers import create_sumo_client_instance

LOGGER = logging.getLogger(__name__)


class EnsembleParameter(BaseModel):
    name: str
    group_name: Optional[str]
    descriptive_name: Optional[str]
    realizations: List[int]
    values: List[Union[str, int, float]]


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
        random_table_that_has_parameters = case.tables.filter(
            name="summary", tagname="eclipse", iteration="iter-0", aggregation="collection", column="FOPT"
        )[0]

        # The parameters are stored in a nested dictionary, where the first level should be the parameter group name.
        # Problem is that only some of the parameters are in a group, and some are not.
        parameters_dict: Dict[Dict[str, Union[str, Dict[str, str]]]] = random_table_that_has_parameters["fmu"][
            "iteration"
        ]["parameters"]
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
                        values=[],
                        realizations=[],
                    )
                    for realization, value in parameter_obj.items():
                        ensemble_parameter.values.append(value)
                        ensemble_parameter.realizations.append(int(realization))
                    ensemble_parameters.append(ensemble_parameter)
            else:
                ensemble_parameter = EnsembleParameter(
                    name=parameter_group_name,
                    values=[],
                    realizations=[],
                )
                for realization, value in parameter_group_obj.items():
                    ensemble_parameter.values.append(value)
                    ensemble_parameter.realizations.append(int(realization))
                ensemble_parameters.append(ensemble_parameter)

        return ensemble_parameters
