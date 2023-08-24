import logging
from typing import List

import numpy as np
import orjson as json
from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.sumo_access.seismic_access import SeismicAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper

from src.services.sumo_access.seismic_types import SeismicCubeSchema
from src.services.oneseismic_access.vds_access import VdsAccess


from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_3dsurvey_directory/")
def get_seismic_3dsurvey_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.Seismic3DSurveyDirectory:
    """
    Get a directory of seismic 3D surveys.
    """
    access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_dir = access.get_seismic_3dsurvey_directory()
    return seismic_dir


@router.get("/seismic_4dsurvey_directory/")
def get_seismic_4dsurvey_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.Seismic4DSurveyDirectory:
    """
    Get a directory of seismic 4D surveys.
    """
    access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_dir = access.get_seismic_4dsurvey_directory()
    return seismic_dir


@router.get("/get_seismic_attribute_near_surface/")
def get_seismic_attribute_near_surface(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_cube_attribute: str = Query(description="Seismic cube attribute"),
    seismic_timestamp_or_timestep: str = Query(description="Timestamp or timestep"),
    surface_name: str = Query(description="Surface name"),
    surface_attribute: str = Query(description="Surface attribute"),
) -> None:
    """
    Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
    """
    seismic_access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    timestamp = None
    timestep = None
    if "--" in seismic_timestamp_or_timestep:
        timestep = seismic_timestamp_or_timestep
    else:
        timestamp = seismic_timestamp_or_timestep
    vds_handle = seismic_access.get_vds_handle(
        realization=1,
        iteration=ensemble_name,
        cube_tagname=seismic_cube_attribute,
        timestep=timestep,
        timestamp=timestamp,
    )

    surface_access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtg_surf = surface_access.get_static_surf(real_num=1, name=surface_name, attribute=surface_attribute).copy()

    vdsaccess = VdsAccess(vds_handle)
    seismic_values = vdsaccess.get_surface_values(xtgeo_surf=xtg_surf, above=5, below=5, attribute="mean")

    return None


@router.get("/get_slice/")
def get_slice(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_cube_attribute: str = Query(description="Seismic cube attribute"),
    seismic_time_string: str = Query(description="Timestamp or timestep"),
    direction: str = Query(description="Sumo case uuid"),
    lineno: int = Query(description="Sumo case uuid"),
) -> None:
    seismic_access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    timestamp = None
    timestep = None
    if "--" in seismic_time_string:
        timestep = seismic_time_string
    else:
        timestamp = seismic_time_string
    vds_handle = seismic_access.get_vds_handle(
        realization=realization_num,
        iteration=ensemble_name,
        cube_tagname=seismic_cube_attribute,
        timestep=timestep,
        timestamp=timestamp,
    )
    vdsaccess = VdsAccess(vds_handle)
    vdsaccess.get_slice(lineno=lineno, direction=direction)
