import datetime
import logging
from typing import List, Optional, Literal, Sequence, Dict

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query

from ....services.sumo_access.parameter_access import ParameterAccess
from ....services.sumo_access.generic_types import EnsembleCorrelations
from ....services.parameter_correlations import correlate_parameters_with_response
from ....services.sumo_access.summary_access import SummaryAccess
from ....services.utils.authenticated_user import AuthenticatedUser
from ....services.utils.perf_timer import PerfTimer
from ...auth.auth_helper import AuthHelper
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/correlate_parameters_with_timeseries/")
def correlate_parameters_with_timeseries(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    vector_name: str = Query(description="Name of the vector"),
    timestep: datetime.datetime = Query(description= "Timestep"),
    # realizations: Optional[Sequence[int]] = Query(None, description="Optional list of realizations to include. If not specified, all realizations will be returned."),
    parameter_names: Optional[List[str]] = Query(None, description="Optional subset of parameters to correlate. Default are all parameters.")
    # fmt:on
) -> EnsembleCorrelations:
    """Get parameter correlations for a timeseries at a given timestep"""

    summary_access = SummaryAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameter_access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid=case_uuid, iteration_name=ensemble_name)

    vector_values = summary_access.get_vector_values_at_timestep(vector_name=vector_name, timestep=timestep, realizations=None)
    parameters = parameter_access.get_parameters()

    return correlate_parameters_with_response(parameters, vector_values)
    

