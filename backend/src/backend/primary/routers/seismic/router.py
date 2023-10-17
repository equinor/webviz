import logging
import numpy as np
from numpy.typing import NDArray
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Body

from src.services.sumo_access.seismic_access import SeismicAccess
from src.services.vds_access.vds_access import VdsAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.services.utils.b64 import b64_encode_float_array_as_float32
from services.vds_access.response_types import VdsMetadata
from src.services.vds_access.request_types import VdsCoordinateSystem, VdsCoordinates

from . import schemas


LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_directory/")
async def get_seismic_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SeismicCubeMeta]:
    """
    Get a directory of seismic cubes.
    """
    access = await SeismicAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_cube_metas = await access.get_seismic_directory()
    try:
        return [schemas.SeismicCubeMeta(**meta.__dict__) for meta in seismic_cube_metas]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/fence/")
async def get_fence(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    polyline: schemas.SeismicFencePolyline = Body(alias="seismicFencePolyline", embed=True),
) -> schemas.SeismicFenceData:
    """Get a fence of seismic data from a set of (x, y) coordinates."""

    # NOTE: This is a post request as cutting plane must be a body parameter. Should the naming be changed from "get_fence" to "post_fence"?

    seismic_access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    try:
        vds_handle = seismic_access.get_vds_handle(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    vds_access = VdsAccess(vds_handle)

    # Retrieve fence and post as seismic intersection
    values_float32 = await vds_access.get_fence(
        coordinate_system=VdsCoordinateSystem.CDP,
        coordinates=VdsCoordinates(polyline.x_points, polyline.y_points),
    )

    meta: VdsMetadata = await vds_access.get_metadata()

    # Ensure axis len = 3?
    z_axis_meta = meta.axis[2]

    # Provide/return the "shape" of the np.ndarray to the frontend
    return schemas.SeismicFenceData(
        values_base64arr=b64_encode_float_array_as_float32(values_float32), z_axis=z_axis_meta
    )
