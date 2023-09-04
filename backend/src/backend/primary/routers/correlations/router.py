import datetime
import logging
from typing import List

from fastapi import APIRouter, Depends, Query

from src.services.sumo_access.parameter_access import ParameterAccess
from src.services.sumo_access.generic_types import EnsembleCorrelations
from src.services.parameter_correlations import correlate_parameters_with_response
from src.services.sumo_access.summary_access import SummaryAccess
from src.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper


LOGGER = logging.getLogger(__name__)

router = APIRouter()


# @router.get("/correlate_parameters_with_timeseries/")
# def correlate_parameters_with_timeseries(
#     # fmt:off
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
#     case_uuid: str = Query(description="Sumo case uuid"),
#     ensemble_name: str = Query(description="Ensemble name"),
#     vector_name: str = Query(description="Name of the vector"),
#     timestep: datetime.datetime = Query(description= "Timestep"),
#     # realizations: Optional[Sequence[int]] = Query(None, description="Optional list of realizations to include. If not specified, all realizations will be returned."),
#     # parameter_names: Optional[List[str]] = Query(None, description="Optional subset of parameters to correlate. Default are all parameters.")
#     # fmt:on
# ) -> EnsembleCorrelations:
#     """Get parameter correlations for a timeseries at a given timestep"""

#     summary_access = SummaryAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
#     parameter_access = ParameterAccess(
#         authenticated_user.get_sumo_access_token(),
#         case_uuid=case_uuid,
#         iteration_name=ensemble_name,
#     )

#     ensemble_response = summary_access.get_vector_values_at_timestep(
#         vector_name=vector_name, timestep=timestep, realizations=None
#     )
#     parameters = parameter_access.get_parameters_and_sensitivities()

#     return correlate_parameters_with_response(parameters.parameters, ensemble_response)


# @router.get("/correlate_parameters_with_inplace_volumes/")
# def correlate_parameters_with_inplace_volumes(
#     # fmt:off
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
#     case_uuid: str = Query(description="Sumo case uuid"),
#     ensemble_name: str = Query(description="Ensemble name"),
#     table_name: str = Query(description="Table name"),
#     response_name:str = Query(description="Response name"),
#     # categorical_filter:Optional[List[InplaceVolumetricsCategoricalMetaData]] = None,
#     # realizations: Optional[Sequence[int]] = Query(None, description="Optional list of realizations to include. If not specified, all realizations will be returned."),
#     # parameter_names: Optional[List[str]] = Query(None, description="Optional subset of parameters to correlate. Default are all parameters.")
#     # fmt:on
# ) -> EnsembleCorrelations:
#     """Get parameter correlations for an inplace volumetrics response"""

#     inplace_access = InplaceVolumetricsAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
#     parameter_access = ParameterAccess(
#         authenticated_user.get_sumo_access_token(),
#         case_uuid=case_uuid,
#         iteration_name=ensemble_name,
#     )
#     ensemble_response = inplace_access.get_response(
#         table_name, response_name, categorical_filters=None, realizations=None
#     )
#     parameters = parameter_access.get_parameters_and_sensitivities()

#     return correlate_parameters_with_response(parameters.parameters, ensemble_response)
