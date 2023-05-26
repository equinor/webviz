import logging

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from .queries.parameters import get_parameters_for_iteration
from ._helpers import create_sumo_client_instance
from ..utils.parameters import create_ensemble_parameters
from ..types.parameter_types import EnsembleParameters, EnsembleParameter

LOGGER = logging.getLogger(__name__)


class ParameterAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self.case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(self.case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

    def get_parameters(self) -> EnsembleParameters:
        """Retrieve parameters for an ensemble"""

        sumo_parameters = get_parameters_for_iteration(
            self._sumo_client, self._case_uuid, self._iteration_name.strip("iter-")
        )
        ensemble_parameters = create_ensemble_parameters(sumo_parameters)
        return ensemble_parameters

    def get_parameter(self, parameter_name: str) -> EnsembleParameter:
        """Retrieve a single parameter for an ensemble"""
        parameters = self.get_parameters()
        return next(parameter for parameter in parameters.parameters if parameter.name == parameter_name)
