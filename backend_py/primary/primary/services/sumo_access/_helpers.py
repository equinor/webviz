import logging
from typing import Any

from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import Case
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
            http_client=FakeHTTPXClient(),
            async_http_client=httpx_async_client.client,
        )
    timer.record_lap("create_sumo_client()")
    LOGGER.debug(f"{timer.to_string()}ms")
    return sumo_client


async def create_sumo_case_async(client: SumoClient, case_uuid: str, want_keepalive_pit: bool) -> Case:
    timer = PerfMetrics()

    search_context = SearchContext(client)
    try:
        case = await search_context.get_case_by_uuid_async(case_uuid)
    except Exception as exc:
        raise NoDataError(f"Sumo case not found for {case_uuid=}", Service.SUMO) from exc

    timer.record_lap("create_sumo_case")

    LOGGER.debug(timer.to_string())

    return case
