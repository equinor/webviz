import logging
from typing import List, Optional

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from .queries.parameters import get_parameters_for_iteration, SumoEnsembleParameter
from ._helpers import create_sumo_client_instance
from .parameter_types import (
    EnsembleParameter,
    EnsembleParameters,
)
from ..utils.parameter_utils import create_ensemble_sensitivities, create_ensemble_parameter

LOGGER = logging.getLogger(__name__)


class ParameterAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self.case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(self.case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

    def get_parameters_and_sensitivities(self) -> EnsembleParameters:
        """Retrieve parameters for an ensemble"""

        # Sumo query. Replace with explorer when ready
        sumo_parameters: List[SumoEnsembleParameter] = get_parameters_for_iteration(
            self._sumo_client, self._case_uuid, self._iteration_name
        )

        sensitivities = create_ensemble_sensitivities(sumo_parameters)
        parameters = [create_ensemble_parameter(sumo_parameter) for sumo_parameter in sumo_parameters]

        return EnsembleParameters(
            parameters=parameters,
            sensitivities=sensitivities,
        )

    def get_parameter(self, parameter_name: str) -> EnsembleParameter:
        """Retrieve a single parameter for an ensemble"""
        parameters = self.get_parameters_and_sensitivities()
        return next(parameter for parameter in parameters.parameters if parameter.name == parameter_name)
