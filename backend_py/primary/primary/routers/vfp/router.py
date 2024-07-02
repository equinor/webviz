from typing import List
from fastapi import APIRouter, Depends, Query
from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.sumo_access.vfp_access import VfpAccess
from . import schemas

from webviz_pkg.core_utils.perf_timer import PerfTimer
import logging

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/realization_vfp_table_names/")
async def get_realization_vfp_table_names(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    # fmt:on
) -> List[str]:
    timer = PerfTimer()

    vfp_access = VfpAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    timer.lap_ms()
    vfp_table_names = vfp_access.get_all_vfp_tables_for_realization()


    LOGGER.info(
        f"All Vfp table names loaded in: {timer.elapsed_ms()}ms "
    )

    return vfp_table_names