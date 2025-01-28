import logging

from fmu.sumo.explorer.explorer import SumoClient, Pit
from fmu.sumo.explorer.objects import CaseCollection, Case
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.service_exceptions import Service, NoDataError, MultipleDataMatchesError

LOGGER = logging.getLogger(__name__)


def create_sumo_client(access_token: str) -> SumoClient:
    if access_token == "DUMMY_TOKEN_FOR_TESTING":  # nosec bandit B105
        sumo_client = SumoClient(env=config.SUMO_ENV, interactive=False)
    else:
        sumo_client = SumoClient(env=config.SUMO_ENV, token=access_token, interactive=False)
    return sumo_client


async def create_sumo_case_async(client: SumoClient, case_uuid: str, want_keepalive_pit: bool) -> Case:
    timer = PerfTimer()

    pit: Pit | None = None
    et_create_pit_ms = -1
    if want_keepalive_pit:
        pit = Pit(client, keep_alive="1m")
        et_create_pit_ms = timer.lap_ms()

    case_collection = CaseCollection(client, pit=pit).filter(uuid=case_uuid)

    matching_case_count = await case_collection.length_async()
    if matching_case_count == 0:
        raise NoDataError(f"Sumo case not found for {case_uuid=}", Service.SUMO)
    if matching_case_count > 1:
        raise MultipleDataMatchesError(f"Multiple sumo cases found for {case_uuid=}", Service.SUMO)
    et_locate_case_ms = timer.lap_ms()

    case = case_collection[0]

    LOGGER.debug(f"create_sumo_case_async() took {timer.elapsed_ms()}ms ({et_create_pit_ms=}, {et_locate_case_ms=})")

    return case
