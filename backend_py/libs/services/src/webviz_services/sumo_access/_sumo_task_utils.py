"""Shared utilities for submitting and polling Sumo aggregation tasks.

Used by both surface_access and summary_access to avoid duplicating the
task UUID extraction, HTTP timeout detection, and polling loop logic.
"""

import asyncio
import logging
from dataclasses import dataclass

import httpx
from fmu.sumo.explorer.explorer import SumoClient

from webviz_core_utils.exponential_backoff_timer import ExponentialBackoffTimer
from webviz_services.service_exceptions import (
    InvalidDataError,
    Service,
    ServiceRequestError,
    ServiceTimeoutError,
)

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class SumoTaskInProgress:
    progress_message: str = ""


@dataclass(frozen=True)
class SumoTaskError:
    message: str = ""


@dataclass(frozen=True)
class SumoTaskState:
    """State of a Sumo task as returned by the polling endpoint."""

    status: str  # "running" | "succeeded" | "failed" | "waiting"
    result_url: str | None = None


def extract_task_uuid_from_location(location: str) -> str:
    """Extract the task UUID from a Sumo Location header.

    Example location value:
        https://main-sumo-prod.radix.equinor.com/api/v1/tasks('3de7a9...')/result
    """
    start = location.find("/tasks('") + 8
    end = location.find("')/result", start)
    if start < 8 or end < 0:
        raise InvalidDataError(f"Could not parse task UUID from location header: {location}", Service.SUMO)
    return location[start:end]


def is_httpx_timeout(exc: httpx.HTTPError) -> bool:
    """Return True if the httpx exception represents an upstream timeout.

    Covers client-side timeouts (ConnectTimeout, ReadTimeout) and
    server-side 504 Gateway Timeout.
    """
    if isinstance(exc, (httpx.ConnectTimeout, httpx.ReadTimeout)):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        return exc.response.status_code == 504
    return False


def extract_task_uuid_from_response(httpx_resp: httpx.Response, context_msg: str = "") -> str:
    """Validate the response from a Sumo task submission and extract the task UUID."""
    location = httpx_resp.headers.get("location")
    if not location:
        raise InvalidDataError(
            f"No location header in Sumo task submission response{f' ({context_msg})' if context_msg else ''}",
            Service.SUMO,
        )
    return extract_task_uuid_from_location(location)


async def submit_sumo_task_async(
    submit_coro,
    context_msg: str = "",
) -> str:
    """Execute a Sumo aggregation submission coroutine and return the task UUID.

    Wraps the common pattern of:
    1. Calling an SDK method with no_wait=True
    2. Handling httpx timeout/status errors
    3. Extracting the task UUID from the Location header

    Args:
        submit_coro: An awaitable that returns an httpx.Response (the raw
            response from Sumo when no_wait=True).
        context_msg: Extra context for error messages (e.g. "batch aggregation").
    """
    try:
        httpx_resp = await submit_coro
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.HTTPStatusError) as exc:
        if is_httpx_timeout(exc):
            raise ServiceTimeoutError(
                f"Submitting Sumo task timed out{f' ({context_msg})' if context_msg else ''}", Service.SUMO
            ) from exc
        raise ServiceRequestError(
            f"Error starting Sumo task{f' ({context_msg})' if context_msg else ''}", Service.SUMO
        ) from exc

    if not isinstance(httpx_resp, httpx.Response):
        raise TypeError(f"Unexpected response type from Sumo task submission{f' ({context_msg})' if context_msg else ''}")

    return extract_task_uuid_from_response(httpx_resp, context_msg)


async def poll_sumo_task_state_async(sumo_client: SumoClient, task_id: str) -> SumoTaskState:
    """Do a single poll of a Sumo task and return its current state."""
    poll_path = f"/tasks('{task_id}')"
    poll_resp = await sumo_client.get_async(poll_path)
    poll_resp_dict = poll_resp.json()

    return SumoTaskState(
        status=poll_resp_dict["_source"]["status"],
        result_url=poll_resp_dict["_source"].get("result_url"),
    )


async def poll_sumo_task_until_done_async(
    sumo_client: SumoClient,
    task_id: str,
    timeout_s: float,
    initial_delay_s: float = 1,
    max_delay_s: float = 10,
) -> SumoTaskState:
    """Poll a Sumo task with exponential backoff until it completes or times out.

    Use timeout_s=0 for a single-shot poll (hybrid pattern).

    Returns the final SumoTaskState. The caller decides how to interpret
    "succeeded", "failed", or still-running states.
    """
    backoff_timer = ExponentialBackoffTimer(
        initial_delay_s=initial_delay_s,
        max_delay_s=max_delay_s,
        max_total_duration_s=timeout_s,
    )
    while True:
        task_state = await poll_sumo_task_state_async(sumo_client, task_id)

        next_delay_s = backoff_timer.next_delay_s()
        if task_state.status in ["succeeded", "failed"] or next_delay_s is None:
            return task_state

        await asyncio.sleep(next_delay_s)
