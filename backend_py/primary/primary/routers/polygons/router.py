import logging
from typing import List, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary.auth.auth_helper import AuthHelper
from primary.services.smda_access.mocked_drogon_smda_access import _mocked_stratigraphy_access
from primary.services.smda_access.stratigraphy_access import StratigraphyAccess
from primary.services.smda_access.stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from primary.services.sumo_access._helpers import SumoCase
from primary.services.sumo_access.polygons_access import PolygonsAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import converters, schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/polygons_directory/")
async def get_polygons_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.PolygonsMeta]:
    """
    Get a directory of polygons in a Sumo ensemble
    """
    access = await PolygonsAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    polygons_dir = await access.get_polygons_directory_async()

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    strat_column_identifier = await case_inspector.get_stratigraphic_column_identifier()
    strat_access: Union[StratigraphyAccess, _mocked_stratigraphy_access.StratigraphyAccess]

    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        strat_access = _mocked_stratigraphy_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())
    strat_units = await strat_access.get_stratigraphic_units(strat_column_identifier)
    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)

    return converters.to_api_polygons_directory(polygons_dir, sorted_stratigraphic_surfaces)


@router.get("/polygons_data/")
async def get_polygons_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
) -> List[schemas.PolygonData]:
    timer = PerfTimer()

    access = await PolygonsAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_poly = await access.get_polygons_async(real_num=realization_num, name=name, attribute=attribute)

    if not xtgeo_poly:
        raise HTTPException(status_code=404, detail="Polygons not found")

    poly_data_response = converters.to_api_polygons_data(xtgeo_poly)

    LOGGER.debug(f"Loaded polygons and created response, total time: {timer.elapsed_ms()}ms")
    return poly_data_response
