import logging
from typing import List

from fastapi import APIRouter, Depends, Query, Response, HTTPException

from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.services.sumo_access.vfp_access import VfpAccess
from primary.services.sumo_access.vfp_types import VfpProdTable
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vfp_table_names/")
async def get_vfp_table_names(
    # fmt:off
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    # fmt:on
) -> List[str]:
    perf_metrics = ResponsePerfMetrics(response)

    vfp_access = await VfpAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    perf_metrics.record_lap("get-access")
    vfp_table_names = await vfp_access.get_all_vfp_table_names_for_realization(realization=realization)
    perf_metrics.record_lap("get-available-vfp-table-names")
    LOGGER.info(f"All Vfp table names loaded in: {perf_metrics.to_string()}")

    return vfp_table_names


@router.get("/vfp_table/")
async def get_vfp_table(
    # fmt:off
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    vfp_table_name: str = Query(description="VFP table name")
    # fmt:on
) -> VfpProdTable:
    perf_metrics = ResponsePerfMetrics(response)

    vfp_access = await VfpAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    perf_metrics.record_lap("get-access")
    try:
        vfp_table: VfpProdTable = await vfp_access.get_vfpprod_table_from_tagname(
            tagname=vfp_table_name, realization=realization
        )
    except NotImplementedError as ex:
        raise HTTPException(status_code=404, detail=ex)

    perf_metrics.record_lap("get-vfp-table")
    LOGGER.info(f"VFP table loaded in: {perf_metrics.to_string()}")

    return vfp_table
