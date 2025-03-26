import logging

from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import Case
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import Service, NoDataError


LOGGER = logging.getLogger(__name__)


async def create_sumo_case_async(client: SumoClient, case_uuid: str) -> Case:
    timer = PerfMetrics()
    search_context = SearchContext(client)
    try:
        case = await search_context.get_case_by_uuid_async(case_uuid)
    except Exception as exc:
        raise NoDataError(f"Sumo case not found for {case_uuid=}", Service.SUMO) from exc

    timer.record_lap("create_sumo_case")

    LOGGER.debug(timer.to_string())

    return case
