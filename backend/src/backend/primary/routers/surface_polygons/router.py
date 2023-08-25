import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.surface_polygon_access import SurfacePolygonsAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper


from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/surface_polygons_directory/")
def get_surface_polygons_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.SurfacePolygonDirectory:
    """
    Get a directory of surface polygon names and attributes
    """
    access = SurfacePolygonsAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    polygons_dir = access.get_surface_polygons_dir()

    return schemas.SurfacePolygonDirectory(
        names=polygons_dir.names,
        attributes=polygons_dir.attributes,
        valid_attributes_for_name=polygons_dir.valid_attributes_for_name,
    )


@router.get("/surface_polygons_data/")
def get_surface_polygons_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
) -> List[schemas.PolygonData]:
    timer = PerfTimer()

    access = SurfacePolygonsAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_poly = access.get_surface_polygons(real_num=realization_num, name=name, attribute=attribute)

    if not xtgeo_poly:
        raise HTTPException(status_code=404, detail="Surface not found")

    poly_data_response = converters.to_api_polygons_data(xtgeo_poly)

    LOGGER.debug(f"Loaded static surface and created image, total time: {timer.elapsed_ms()}ms")
    return poly_data_response
