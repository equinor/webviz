import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.sumo_access.seismic_access import SeismicAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper
from src.backend.primary.routers.seismic import converters, schemas
from src.services.types.seismic_types import SeismicCubeSchema
from src.services.oneseismic_access.vds_slice_access import VdsSliceAccess

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_cube_directory/")
def get_seismic_cube_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[SeismicCubeSchema]:
    """
    Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
    """
    access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_dir = access.get_seismic_cube_directory()
    print(seismic_dir)
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
) -> schemas.SurfaceMeshAndProperty:
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

    vdsaccess = VdsSliceAccess(vds_handle)
    seismic_values = vdsaccess.get_surface_values(xtgeo_surf=xtg_surf, above=5, below=5, attribute="mean")

    return converters.to_api_surface_data(xtg_surf, seismic_values)
