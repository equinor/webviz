import logging
from typing import Annotated

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query

from src.backend.auth.auth_helper import AuthHelper
from src.services.summary_vector_statistics import compute_vector_statistics
from src.services.sumo_access.generic_types import EnsembleScalarResponse
from src.services.sumo_access.parameter_access import ParameterAccess
from src.services.sumo_access.rft_access import RftAccess
from src.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/well_list")
async def get_well_list(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.RftWellInfo]:
    access = await RftAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    rft_well_list = await access.get_well_list()

    return rft_well_list


@router.get("/realization_data")
async def get_realization_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    well_name: Annotated[str, Query(description="Well name")],
    response_name: Annotated[str, Query(description="Response name")],
    timestamps_utc_ms: Annotated[list[int] | None, Query(description="Timestamps utc ms")] = None,
    realizations: Annotated[list[int] | None, Query(description="Realizations")] = None,
) -> list[schemas.RftWellRealizationData]:
    access = await RftAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    data = await access.get_rft_realization_data(
        well_name=well_name,
        response_name=response_name,
        timestamps_utc_ms=timestamps_utc_ms,
        realizations=realizations,
    )

    return data
