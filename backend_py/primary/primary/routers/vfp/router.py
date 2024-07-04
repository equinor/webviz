import logging
from typing import List

from fastapi import APIRouter, Depends, Query
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.vfp_access import VfpAccess
from primary.services.sumo_access.vfp_types import VfpProdTable
from primary.services.utils.authenticated_user import AuthenticatedUser
from webviz_pkg.core_utils.perf_timer import PerfTimer

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vfp_table_names/")
async def get_vfp_table_names(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    # fmt:on
) -> List[str]:
    timer = PerfTimer()

    vfp_access = await VfpAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    timer.lap_ms()
    vfp_table_names = await vfp_access.get_all_vfp_table_names_for_realization(realization=realization)

    LOGGER.info(f"All Vfp table names loaded in: {timer.elapsed_ms()}ms ")

    return vfp_table_names


@router.get("/vfp_table/")
async def get_vfp_table(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    vfp_table_name: str = Query(description="VFP table name")
    # fmt:on
) -> VfpProdTable:
    timer = PerfTimer()

    vfp_access = await VfpAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    timer.lap_ms()
    vfp_table: VfpProdTable = await vfp_access.get_vfp_table_from_tagname(
        tagname=vfp_table_name, realization=realization
    )

    LOGGER.info(f"VFP table loaded in: {timer.elapsed_ms()}ms ")

    return vfp_table
