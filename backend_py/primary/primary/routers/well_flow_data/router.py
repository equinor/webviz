import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.smda_access import SmdaAccess
from primary.services.well_flow_data_assembler.well_flow_data_assembler import WellFlowDataAssembler


from . import schemas, converters


LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/flow_data_info")
async def get_flow_data_info(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    field_identifier: Annotated[str, Query(description="Field identifier")],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.WellFlowDataInfo]:

    perf_metrics = ResponsePerfMetrics(response)

    smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

    sumo_summary_access = SummaryAccess.from_iteration_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    well_flow_data_assembler = WellFlowDataAssembler(
        field_identifier=field_identifier, summary_access=sumo_summary_access, smda_access=smda_access
    )
    perf_metrics.record_lap("get_well_flow_data_info")
    well_info = await well_flow_data_assembler.get_well_flow_data_info_async()

    return converters.to_api_well_flow_data_info(well_info)


@router.get("/flow_data_in_time_interval/")
async def get_flow_data_in_time_interval(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    field_identifier: Annotated[str, Query(description="Field identifier")],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    realization: Annotated[int, Query(description="Realization number")],
    volume_limit: Annotated[float, Query(description="Minimum volume limit")],
    start_timestamp_utc_ms: Annotated[int, Query(description="Start timestamp in UTC milliseconds")],
    end_timestamp_utc_ms: Annotated[int, Query(description="End timestamp in UTC milliseconds")],
) -> list[schemas.WellFlowData]:

    perf_metrics = ResponsePerfMetrics(response)

    smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

    sumo_summary_access = SummaryAccess.from_iteration_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    well_flow_data_assembler = WellFlowDataAssembler(
        field_identifier=field_identifier, summary_access=sumo_summary_access, smda_access=smda_access
    )

    well_production_data = await well_flow_data_assembler.get_well_flow_data_in_interval_async(
        realization=realization,
        minimum_volume_limit=volume_limit,
        start_timestamp_utc_ms=start_timestamp_utc_ms,
        end_timestamp_utc_ms=end_timestamp_utc_ms,
    )

    perf_metrics.record_lap("get_production_data_for_interval")

    return converters.to_api_well_flow_data(well_production_data)
