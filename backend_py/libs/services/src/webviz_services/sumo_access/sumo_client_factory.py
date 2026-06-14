import logging

from sumo.wrapper import SumoClient, RetryStrategy
from webviz_core_utils.perf_timer import PerfTimer

from webviz_services.services_config import get_services_config
from webviz_services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER

LOGGER = logging.getLogger(__name__)


class _FakeSyncHttpClient:
    """A fake HTTP client to ensure we use async methods instead of sync ones.
    This is needed as we do not want to allow any synchronous HTTP calls in the primary service.
    Ideally this should be handled by the SumoClient. https://github.com/equinor/fmu-sumo/issues/369"""

    def __getattribute__(self, _name: str) -> None:
        # Raise an error on access to this instance. It should not be touched!
        # It should be used merely as a placeholder since we cannot pass None when initializing the SumoClient
        raise RuntimeError("This is a fake sync http client and should not be called!!!")


def create_sumo_client(access_token: str) -> SumoClient:
    timer: PerfTimer | None = None
    # timer = PerfTimer()

    services_config = get_services_config()

    if access_token == "DUMMY_TOKEN_FOR_TESTING":  # nosec bandit B105
        sumo_client = SumoClient(env=services_config.sumo_env, interactive=False)
    else:
        sumo_client = SumoClient(
            env=services_config.sumo_env,
            token=access_token,
            retry_strategy=RetryStrategy(stop_after=1),
            http_client=_FakeSyncHttpClient(),
            async_http_client=HTTPX_ASYNC_CLIENT_WRAPPER.client,
            timeout=120,
        )

    if timer:
        LOGGER.debug(f"create_sumo_client() took: {timer.elapsed_ms()}ms")

    return sumo_client
