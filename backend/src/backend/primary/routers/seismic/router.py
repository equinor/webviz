import logging
from typing import List
import orjson as json

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Body

from src.services.sumo_access.seismic_access import SeismicAccess
from src.services.vds_access.vds_access import VdsAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_directory/")
def get_seismic_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SeismicCubeMeta]:
    """
    Get a directory of seismic cubes.
    """
    access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_cube_metas = access.get_seismic_directory()
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
    # cutting_plane: schemas.CuttingPlane = Body(alias="cuttingPlane", embed=True),
) -> schemas.SeismicIntersectionData:
    """Get a fence of seismic data from a set of coordinates."""
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

    vdsaccess = VdsAccess(vds_handle)

    vals = await vdsaccess.get_fence(
        coordinate_system="cdp",
        coordinates=[
            [x, y]
            for x, y in zip(
                [
                    463156.911,
                    463564.402,
                    463637.925,
                    463690.658,
                    463910.452,
                ],
                [
                    5929542.294,
                    5931057.803,
                    5931184.235,
                    5931278.837,
                    5931688.122,
                ],
            )
        ],
    )
    meta = await vdsaccess.get_metadata()
    z_axis_meta = meta.axis[2]

    z_arr = np.linspace(z_axis_meta.min, z_axis_meta.max, z_axis_meta.samples)
    return schemas.SeismicIntersectionData(
        values_arr_str=json.dumps(vals.values),  # pylint: disable=no-member
        z_arr_str=json.dumps(z_arr.tolist()),  # pylint: disable=no-member
    )
