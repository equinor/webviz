import logging
from typing import Any

from fmu.sumo.explorer.explorer import SumoClient, Pit
from fmu.sumo.explorer.objects import CaseCollection, Case
from webviz_pkg.core_utils.perf_timer import PerfTimer
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary import config
from primary.httpx_client import httpx_async_client
from primary.services.service_exceptions import Service, NoDataError, MultipleDataMatchesError

LOGGER = logging.getLogger(__name__)


class SynchronousMethodCallError(Exception):
    """Custom error for when synchronous methods are called instead of async."""


class FakeHTTPXClient:
    """A fake HTTPX client to ensure we use async methods instead of sync ones.
    This is needed as we do not want to allow any synchronous HTTP calls in the primary service.
    Ideally this should be handled by the SumoClient. https://github.com/equinor/fmu-sumo/issues/369"""

    def __init__(self, *args: Any, **kwargs: Any) -> None:  # pylint: disable=unused-argument
        self._error_msg = "🚫 Do not use a synchronous http class!. Use the async http class instead. "

    def __getattr__(self, name: str) -> None:
        """Catch any synchronous method calls and raise a helpful error."""
        async_methods = {"get", "post", "put", "patch", "delete", "head", "options"}
        if name in async_methods:
            raise SynchronousMethodCallError(self._error_msg.format(method=name))
        raise AttributeError(f"'{self.__class__.__name__}' has no attribute '{name}'")


def create_sumo_client(access_token: str) -> SumoClient:
    timer = PerfMetrics()
    if access_token == "DUMMY_TOKEN_FOR_TESTING":  # nosec bandit B105
        sumo_client = SumoClient(env=config.SUMO_ENV, interactive=False)
    else:
        sumo_client = SumoClient(
            env=config.SUMO_ENV,
            token=access_token,
            http_client=None,  # Until we update fmu-sumo > 2.0 we need to initialize a sync client.
            async_http_client=httpx_async_client.client,
        )
    timer.record_lap("create_sumo_client()")
    LOGGER.debug(f"{timer.to_string()}ms")
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
