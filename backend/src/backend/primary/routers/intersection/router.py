import logging
from typing import List


from fastapi import APIRouter, Depends, Query


from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.intersection_service import IntersectionService, IntersectedStatisticalSurface
from src.services.utils.statistic_function import StatisticFunction

from ..surface import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/statistical_surfaces/")
def statistical_surfaces(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    polyline_xy: List[float] = Query(description="Polyline in xy plane for intersection"),
    # fmt:on
) -> list[IntersectedStatisticalSurface]:
    """Get well headers for all wells in the field"""

    surface_access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    # if service_stat_func_to_compute is not None:
    #     xtgeo_surf = surface_access.get_statistical_static_surf(
    #         statistic_function=service_stat_func_to_compute,
    #         name=name,
    #         attribute=attribute,
    #     )
    intersection_service = IntersectionService(
        [
            [463156.911, 5929542.294, 0],
            [463564.402, 5931057.803, 0],
            [463637.925, 5931184.235, 0],
            [463690.658, 5931278.837, 0],
            [463910.452, 5931688.122, 0],
            [464465.876, 5932767.761, 0],
            [464765.876, 5934767.761, 0],
        ]
    )
    return intersection_service.intersect_with_statistical_sumo_surfaces(
        surface_access, ["Volon Fm. Top"], "DS_extract_postprocess"
    )
