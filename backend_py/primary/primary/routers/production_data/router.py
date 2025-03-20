import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.smda_access import SmdaAccess
from primary.services.production_data_assembler.production_data_assembler import ProductionDataAssembler


from . import schemas, converters


LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/production_data_in_time_interval/")
async def get_production_data_in_time_interval(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    field_identifier: Annotated[str, Query(description="Field identifier")],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    realization: Annotated[int, Query(description="Realization number")],
    volume_limit: Annotated[float, Query(description="Minimum volume limit")],
    start_timestamp_utc_ms: Annotated[int, Query(description="Start timestamp in UTC milliseconds")],
    end_timestamp_utc_ms: Annotated[int, Query(description="End timestamp in UTC milliseconds")],
) -> list[schemas.WellProductionData]:

    perf_metrics = ResponsePerfMetrics(response)

    smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

    sumo_summary_access = SummaryAccess.from_iteration_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    prod_data_assembler = ProductionDataAssembler(
        field_identifier=field_identifier, summary_access=sumo_summary_access, smda_access=smda_access
    )

    well_production_data = await prod_data_assembler.get_production_data_in_interval_async(
        realization=realization,
        minimum_volume_limit=volume_limit,
        start_timestamp_utc_ms=start_timestamp_utc_ms,
        end_timestamp_utc_ms=end_timestamp_utc_ms,
    )

    perf_metrics.record_lap("get_production_data_for_interval")

    return converters.to_api_well_production_data(well_production_data)
