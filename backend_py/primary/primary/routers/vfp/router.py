import logging

from fastapi import APIRouter, Depends, Query, Response

from webviz_services.sumo_access.vfp_access import VfpAccess
from webviz_services.sumo_access.vfp_types import VfpProdTable, VfpInjTable
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, CacheTime
from primary.utils.response_perf_metrics import ResponsePerfMetrics


from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vfp_tables/")
@cache_time(CacheTime.LONG)
async def get_vfp_tables(
    # fmt:off
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    # fmt:on
) -> list[schemas.VfpTableInfo]:
    """Get the available VFP tables (type and number) for a given ensemble and realization."""
    perf_metrics = ResponsePerfMetrics(response)

    vfp_access = VfpAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    perf_metrics.record_lap("get-access")
    vfp_table_infos = await vfp_access.get_all_vfp_tables_for_realization_async(realization=realization)
    perf_metrics.record_lap("get-available-vfp-tables")
    LOGGER.info(f"All Vfp tables loaded in: {perf_metrics.to_string()}")

    return [converters.to_api_table_info(table_info) for table_info in vfp_table_infos]


@router.get("/vfp_table/")
@cache_time(CacheTime.LONG)
async def get_vfp_table(
    # fmt:off
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    vfp_type: schemas.VfpType = Query(description="VFP table type"),
    vfp_table_number: int = Query(description="VFP table number")
    # fmt:on
) -> schemas.VfpProdTable | schemas.VfpInjTable:
    """
    Get the VFP table for a given ensemble, realization, type and table number.
    """
    perf_metrics = ResponsePerfMetrics(response)

    vfp_access = VfpAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    perf_metrics.record_lap("get-access")

    vfp_table: VfpProdTable | VfpInjTable = await vfp_access.get_vfp_table_from_type_and_number_async(
        vfp_type=converters.to_sumo_vfp_type(vfp_type), table_number=vfp_table_number, realization=realization
    )

    perf_metrics.record_lap("get-vfp-table")
    LOGGER.info(f"VFP table loaded in: {perf_metrics.to_string()}")

    return converters.to_api_table_definitions(vfp_table)
