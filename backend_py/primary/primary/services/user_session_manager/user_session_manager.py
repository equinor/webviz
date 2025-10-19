import asyncio
import contextlib
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import httpx
from pottery import Redlock, AIORedlock

from webviz_pkg.core_utils.background_tasks import run_in_background_task
from webviz_pkg.core_utils.perf_timer import PerfTimer
from webviz_pkg.core_utils.time_countdown import TimeCountdown

from ._radix_helpers import IS_ON_RADIX_PLATFORM, RadixResourceRequests, RadixJobApi
from ._redlock_releasing_context import RedlockReleasingContext, AsyncRedlockReleasingContext
from ._user_session_directory import SessionInfo, SessionRunState, UserSessionDirectory
from ._abort_controller import AbortError, redis_abort_listener, run_with_abort, AsyncAbortController, AsyncAbortSignal

LOGGER = logging.getLogger(__name__)


class UserComponent(str, Enum):
    GRID3D_RI = "GRID3D_RI"
    MOCK = "MOCK"


@dataclass(frozen=True, kw_only=True)
class _UserSessionDef:
    # fmt:off
    job_component_name: str             # The job's component name in radix, or the service name in docker compose, e.g. "user-mock"
    port: int                           # The port number for the radix job manager AND the actual port of the service. These must be the same for our current docker compose setup
    resource_req: RadixResourceRequests # The resource requests for the radix job
    payload_dict: dict | None           # The payload to be sent to the radix job manager
    # fmt:on


# Maximum limits in "resources" for a Radix job is as of May 2023
# The specs of a single Standard_E16as_v4 node, i.e.:
#  * vCPU: 16
#  * memory: 128 GiB
#  * temp storage (SSD): 256 GiB
#
_USER_SESSION_DEFS: dict[UserComponent, _UserSessionDef] = {
    UserComponent.MOCK: _UserSessionDef(
        job_component_name="user-mock",
        port=8001,
        resource_req=RadixResourceRequests(cpu="100m", memory="200Mi"),
        payload_dict=None,
    ),
    UserComponent.GRID3D_RI: _UserSessionDef(
        job_component_name="user-grid3d-ri",
        port=8002,
        resource_req=RadixResourceRequests(cpu="4", memory="16Gi"),
        payload_dict={"ri_omp_num_treads": 4},
    ),
}


class UserSessionManager:
    def __init__(self, user_id: str, username: str | None) -> None:
        self._user_id = user_id
        self._username = username
        self._session_dir = UserSessionDirectory(user_id)

    async def get_or_create_session_async(self, user_component: UserComponent, instance_str: str) -> str | None:
        session_def = _USER_SESSION_DEFS[user_component]
        channel_name = self._session_dir.make_abort_channel_name(session_def.job_component_name, instance_str)

        redis_client = self._session_dir.get_redis_client()
        abort_ctrl = AsyncAbortController()
        abort_listener_task = asyncio.create_task(redis_abort_listener(redis_client, channel_name, abort_ctrl))

        try:
            return await self.do_get_or_create_session_async(user_component, instance_str, abort_ctrl.signal)

        finally:
            abort_listener_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await abort_listener_task

    async def do_get_or_create_session_async(
        self, user_component: UserComponent, instance_str: str, abort_signal: AsyncAbortSignal
    ) -> str | None:
        ctx_str = f"{user_component.name=}, {instance_str=}, {self._username=}"
        timer = PerfTimer()
        LOGGER.debug(f"Get or create user session for: {ctx_str}")

        session_def = _USER_SESSION_DEFS[user_component]
        actual_service_port = session_def.port

        # Note that currently the timeout values (approx_timeout_s) used here are purely experimental at the moment.
        # We may be able to get some insights from the Radix team on this, but still this will have to
        # be weighed up against how long a timeout is acceptable from a user standpoint.
        creation_time_budget_s = 120
        time_countdown = TimeCountdown(creation_time_budget_s, None)

        existing_session_info = await _get_info_for_running_session(
            session_dir=self._session_dir,
            job_component_name=session_def.job_component_name,
            job_scheduler_port=session_def.port,
            instance_str=instance_str,
            actual_service_port=actual_service_port,
            approx_timeout_s=creation_time_budget_s,
        )
        if existing_session_info:
            session_url = _make_session_url(existing_session_info, actual_service_port)
            LOGGER.info(f"Got existing user session in: {timer.elapsed_ms()}ms ({ctx_str}, {session_url=})")
            return session_url

        # No existing running session was found, so we will try and create a new one
        # We check the abort signal here before proceeding with the actual creation since it may have
        # been triggered while we were waiting for the existing session to appear
        if abort_signal.aborted:
            LOGGER.info(f"User session creation aborted by abort signal before creation: ({ctx_str})")
            return None

        LOGGER.info(f"No existing user session, creating new session for: {ctx_str}")

        redis_client = self._session_dir.get_redis_client()
        lock_key_name: str = self._session_dir.make_lock_key(session_def.job_component_name, instance_str)
        distributed_lock = AIORedlock(
            key=lock_key_name, masters={redis_client}, auto_release_time=creation_time_budget_s + 30
        )

        LOGGER.debug(f"Trying to acquire distributed creation lock for {lock_key_name=} ({ctx_str})")
        if not await distributed_lock.acquire(blocking=True, timeout=1):
            # We were unable to acquire the lock. This could mean we have race condition where someone
            # else is also trying to create the same new session, or some other locking operation is ongoing.
            # In this case, do a bit of sleep and try another wait cycle before giving up.
            LOGGER.info(f"Creation lock was busy, trying to wait for session to become running ({ctx_str})")
            await asyncio.sleep(5)
            session_info = await _get_info_for_running_session(
                session_dir=self._session_dir,
                job_component_name=session_def.job_component_name,
                job_scheduler_port=session_def.port,
                instance_str=instance_str,
                actual_service_port=actual_service_port,
                approx_timeout_s=110,
            )
            if session_info:
                session_url = _make_session_url(session_info, actual_service_port)
                LOGGER.info(f"Session entered running state after waiting, returning it: ({ctx_str}, {session_url=})")
                return session_url
            else:
                LOGGER.error(f"Session did not enter running state after waiting, giving up ({ctx_str})")
                return None

        # So we have acquired the lock, meaning we can safely try and create the new session.
        # Wrap the entire creation process in a try/except to be able to handle aborts and also do release
        # of the distributed lock in a safe manner.
        # Note that before we proceed, we try and delete any existing session info and radix job for this session
        try:
            await _try_delete_session_and_radix_job(
                session_dir=self._session_dir,
                job_component_name=session_def.job_component_name,
                job_scheduler_port=session_def.port,
                instance_str=instance_str,
            )

            # Form a job id that contains the user info and the instance string
            job_id = f"{self._username}//{instance_str}//{self._user_id}"

            create_session_coro = _create_new_session(
                session_dir=self._session_dir,
                job_component_name=session_def.job_component_name,
                job_scheduler_port=session_def.port,
                resource_req=session_def.resource_req,
                job_id=job_id,
                job_payload_dict=session_def.payload_dict,
                instance_str=instance_str,
                actual_service_port=actual_service_port,
                approx_timeout_s=110,
            )

            new_session_info = await run_with_abort(create_session_coro, abort_signal)

        except Exception as e:
            await _try_delete_session_and_radix_job(
                session_dir=self._session_dir,
                job_component_name=session_def.job_component_name,
                job_scheduler_port=session_def.port,
                instance_str=instance_str,
            )

            if isinstance(e, AbortError):
                LOGGER.info(f"Creation of user session aborted by abort signal: {e} ({ctx_str})")
                return None

            # Re-raise all other exceptions
            raise

        finally:
            # Make sure we always release the distributed lock
            await distributed_lock.release()

        if not new_session_info:
            LOGGER.error(f"Failed to create new user session for: {ctx_str}")
            return None

        session_url = _make_session_url(new_session_info, actual_service_port)
        LOGGER.info(f"Created new user session in: {timer.elapsed_ms()}ms ({ctx_str}, {session_url=})")
        return session_url

    async def get_session_status_async(
        self, user_component: UserComponent, instance_str: str
    ) -> SessionRunState | None:
        LOGGER.debug(f"Get session status for: {user_component.name=}, {instance_str=}, {self._username=}")

        session_def = _USER_SESSION_DEFS[user_component]
        session_info = await self._session_dir.get_session_info_async(session_def.job_component_name, instance_str)
        if not session_info:
            return None

        return session_info.run_state

    async def delete_session_async(self, user_component: UserComponent, instance_str: str) -> bool:
        LOGGER.debug(f"Delete user session: {user_component.name=}, {instance_str=}, {self._username=}")

        session_def = _USER_SESSION_DEFS[user_component]
        session_info = await self._session_dir.get_session_info_async(session_def.job_component_name, instance_str)
        if not session_info:
            LOGGER.info(f"No existing session info found, nothing to delete")
            return False

        # Need to get the distributed lock in order to mutate directory
        redis_client = self._session_dir.get_redis_client()
        lock_key_name: str = self._session_dir.make_lock_key(session_def.job_component_name, instance_str)
        distributed_lock = AIORedlock(key=lock_key_name, masters={redis_client}, auto_release_time=30)

        got_the_lock = await distributed_lock.acquire(blocking=False, timeout=-1)
        if not got_the_lock:
            abort_channel_name = self._session_dir.make_abort_channel_name(session_def.job_component_name, instance_str)
            LOGGER.info(f"Lock for delete was busy, publishing abort message to Redis channel: {abort_channel_name=}")
            await redis_client.publish(abort_channel_name, "user requested abortion")

            LOGGER.info(f"Retrying acquisition of distributed lock for delete operation {lock_key_name=}")
            got_the_lock = await distributed_lock.acquire(blocking=True, timeout=15)
            if not got_the_lock:
                LOGGER.error(f"Distributed lock for delete operation is still busy, giving up {lock_key_name=}")
                return False

        async with AsyncRedlockReleasingContext(distributed_lock):
            LOGGER.info(f"Deleting user session from directory")
            session_info_updater = self._session_dir.create_session_info_updater(
                session_def.job_component_name, instance_str
            )
            await session_info_updater.delete_all_state_async()

        # If we got here, we successfully deleted the session info from the directory
        # Try and kill the actual radix job as well, but just do it in the background
        if IS_ON_RADIX_PLATFORM and session_info and session_info.radix_job_name:
            LOGGER.info(f"Trying to delete job in radix")
            radix_job_api = RadixJobApi(session_def.job_component_name, session_def.port)
            run_in_background_task(radix_job_api.delete_named_job(session_info.radix_job_name))

        return True


# Look for existing session info, possibly waiting for a partially created session to come online
#
# Reasons why this function may return None
#   1. We found the session, but it's not running yet (it's in the process of being created/spinning
#      up or has got stuck while being created)
#   2. We did not find the session in the directory, and it needs to be created
#   3. We found the session and the info says it is running, but our verification probe against
#      radix or a probe against the service's health endpoint says it's not
async def _get_info_for_running_session(
    session_dir: UserSessionDirectory,
    job_component_name: str,
    job_scheduler_port: int,
    instance_str: str,
    actual_service_port: int,
    approx_timeout_s: float,
) -> SessionInfo | None:

    time_countdown = TimeCountdown(approx_timeout_s, None)
    sleep_time_s = 1
    num_calls = 1

    session_info = await session_dir.get_session_info_async(job_component_name, instance_str)
    if not session_info:
        return None

    # Given that we found info on the session and it's not in the running state, we will try and wait for it to come online.
    # The job/session might be in the process of being created and spinning up, so we will try and wait for it.
    # How much time should we spend here before giving up? Currently we just consume an approximate timeout here, and
    # leave it to the caller to decide how much time should be allowed.
    while session_info and session_info.run_state != SessionRunState.RUNNING:
        elapsed_s = time_countdown.elapsed_s()
        if elapsed_s + sleep_time_s > approx_timeout_s:
            LOGGER.debug(
                f"Giving up waiting for user session to enter running state after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"
            )
            return None

        num_calls += 1
        LOGGER.debug(f"Waiting for user session to enter running state, attempt {num_calls}")
        await asyncio.sleep(sleep_time_s)
        session_info = await session_dir.get_session_info_async(job_component_name, instance_str)

    # So by now the session either evaporated from the directory, or it has entered the running state
    # Bail out if it is gone or for some reason is missing the crucial radix job name
    if not session_info or not session_info.radix_job_name:
        return None

    if IS_ON_RADIX_PLATFORM:
        LOGGER.debug("Found user session, verifying its existence against radix job manager")
        radix_job_api = RadixJobApi(job_component_name, job_scheduler_port)
        radix_job_is_running = await radix_job_api.is_radix_job_running(session_info.radix_job_name)
        if not radix_job_is_running:
            LOGGER.debug("Could not find running job in radix job manager")
            return None

        # Can we afford the more extensive live check against the service's health endpoint?
        live_endpoint = f"http://{session_info.radix_job_name}:{actual_service_port}/health/live"
        LOGGER.debug(f"Job is running in radix, probing health endpoint of contained service at: {live_endpoint=}")
        is_ready, msg = await _call_health_endpoint(live_endpoint, timeout_s=2)
        if not is_ready:
            LOGGER.debug(f"Contained service seems to be dead {msg=}")
            return None

        LOGGER.debug("Contained service is alive")

    return session_info


# Try and create a new session with a new radix job and wait for it to come online
# The assumption is that the caller of this function is holding the distributed lock for
# the entire duration of the creation process in this call
async def _create_new_session(
    session_dir: UserSessionDirectory,
    job_component_name: str,
    job_scheduler_port: int,
    resource_req: RadixResourceRequests,
    job_id: str | None,
    job_payload_dict: dict | None,
    instance_str: str,
    actual_service_port: int,
    approx_timeout_s: float,
) -> SessionInfo | None:
    time_countdown = TimeCountdown(approx_timeout_s, None)

    LOGGER.debug(f"Creating new session ({job_component_name=}, {instance_str=})")

    session_info_updater = session_dir.create_session_info_updater(job_component_name, instance_str)
    await session_info_updater.delete_all_state_async()
    await session_info_updater.set_state_creating_async()

    if IS_ON_RADIX_PLATFORM:
        radix_job_api = RadixJobApi(job_component_name, job_scheduler_port)

        LOGGER.debug(f"Creating new job using radix job manager ({job_component_name=}, {job_scheduler_port=})")
        new_radix_job_name = await radix_job_api.create_new_job(resource_req, job_id, job_payload_dict)
        if new_radix_job_name is None:
            LOGGER.error(f"Failed to create new job in radix ({job_component_name=}, {job_scheduler_port=})")
            await session_info_updater.delete_all_state_async()
            return None

        LOGGER.debug(f"New radix job was created, will poll for running state ({new_radix_job_name=})")
        await session_info_updater.set_state_waiting_async(new_radix_job_name)

        # Try and poll the radix job manager here to verify that the job transitions to the running state
        polling_time_budget_s = time_countdown.remaining_s()
        radix_job_is_running = await radix_job_api.poll_until_job_running(new_radix_job_name, polling_time_budget_s)
        if not radix_job_is_running:
            LOGGER.error(
                "The new radix job did not enter running state within time limit of {polling_time_budget_s:.2f}s, giving up and deleting it"
            )
            await session_info_updater.delete_all_state_async()
            run_in_background_task(radix_job_api.delete_named_job(new_radix_job_name))
            return None

        LOGGER.debug(f"Radix job entered running state, will wait for it to come alive ({new_radix_job_name=})")

    else:
        LOGGER.debug("Running locally, will not create a radix job")
        new_radix_job_name = job_component_name
        await asyncio.sleep(5)
        await session_info_updater.set_state_waiting_async(new_radix_job_name)
        await asyncio.sleep(5)

    # It is a bit hard to decide on how long we should wait here before giving up.
    # This must be aligned with the auto release time for our lock and also the polling for session info that is done against redis
    ready_endpoint = f"http://{new_radix_job_name}:{actual_service_port}/health/ready"
    probe_time_budget_s = time_countdown.remaining_s()
    is_ready, msg = await _call_health_endpoint_with_retries(ready_endpoint, probe_time_budget_s)
    if not is_ready:
        LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
        await session_info_updater.delete_all_state_async()
        run_in_background_task(radix_job_api.delete_named_job(new_radix_job_name))
        return None

    await session_info_updater.set_state_running_async()

    session_info = await session_dir.get_session_info_async(job_component_name, instance_str)
    if not session_info:
        LOGGER.error("Failed to get session info after creating new radix job")
        return None

    if session_info.run_state != SessionRunState.RUNNING:
        LOGGER.error(f"Unexpected session info, expected run_state to be running but got {session_info.run_state=}")
        return None

    if not session_info.radix_job_name:
        LOGGER.error("Unexpected empty radix_job_name in session info after creating new radix job")
        return None

    LOGGER.debug(f"New radix job created and online: {session_info.radix_job_name=}")

    return session_info


def _make_session_url(session_info: SessionInfo, actual_service_port: int) -> str:
    session_url = f"http://{session_info.radix_job_name}:{actual_service_port}"
    return session_url


# Try and delete the user session from the directory if it exists
# Will also try and kill the radix job, but this is done as a best-effort in the background
async def _try_delete_session_and_radix_job(
    session_dir: UserSessionDirectory,
    job_component_name: str,
    job_scheduler_port: int,
    instance_str: str,
) -> bool:
    session_info = await session_dir.get_session_info_async(job_component_name, instance_str)
    if not session_info:
        LOGGER.debug(f"_try_delete_session_and_radix_job() - no existing session info found, nothing to delete")
        return False

    LOGGER.debug(f"_try_delete_session_and_radix_job() - found existing session info, proceeding with deletion")
    session_info_updater = session_dir.create_session_info_updater(job_component_name, instance_str)
    await session_info_updater.delete_all_state_async()

    # If we got here, we successfully deleted the session info from the directory
    # Try and kill the actual radix job as well, but just do it in the background
    if IS_ON_RADIX_PLATFORM and session_info and session_info.radix_job_name:
        LOGGER.debug(f"_try_delete_session_and_radix_job() - trying to delete radix job in the background")
        radix_job_api = RadixJobApi(job_component_name, job_scheduler_port)
        run_in_background_task(radix_job_api.delete_named_job(session_info.radix_job_name))

    return True


async def _call_health_endpoint_with_retries(health_url: str, stop_after_delay_s: float) -> Tuple[bool, str]:

    LOGGER.debug(f"_call_health_endpoint_with_retries() - {health_url=} {stop_after_delay_s=:.2f}")

    target_request_timeout_s = 3
    min_request_timeout_s = 1
    sleep_time_s = 1

    time_countdown = TimeCountdown(stop_after_delay_s, None)
    num_calls = 0

    async with httpx.AsyncClient(timeout=target_request_timeout_s) as client:
        while True:
            request_timeout_s = min(target_request_timeout_s, max(min_request_timeout_s, time_countdown.remaining_s()))
            LOGGER.debug(f"_call_health_endpoint_with_retries() - querying endpoint with {request_timeout_s=}")
            success, msg = await _call_health_endpoint_with_client(client, health_url, request_timeout_s)
            num_calls += 1
            if success:
                LOGGER.debug(
                    f"_call_health_endpoint_with_retries() - succeeded on attempt {num_calls}, time spent: {time_countdown.elapsed_s():.2f}s, {msg=}"
                )
                return success, msg

            LOGGER.debug(f"_call_health_endpoint_with_retries() - attempt {num_calls} failed with error: {msg=}")

            elapsed_s = time_countdown.elapsed_s()
            if elapsed_s + sleep_time_s + min_request_timeout_s > stop_after_delay_s:
                LOGGER.debug(
                    f"_call_health_endpoint_with_retries() - giving up after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"
                )
                return False, f"Giving up after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"

            await asyncio.sleep(sleep_time_s)


async def _call_health_endpoint(health_url: str, timeout_s: float) -> Tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        return await _call_health_endpoint_with_client(client, health_url, timeout_s)


async def _call_health_endpoint_with_client(
    client: httpx.AsyncClient, health_url: str, timeout_s: float
) -> Tuple[bool, str]:
    try:
        response = await client.get(url=health_url, timeout=timeout_s)
        if response.status_code == 200:
            return True, f"{response.text=}"

        return False, f"{response.status_code=}, {response.text=}"

    except httpx.RequestError as exception:
        return False, f"Request error: {exception=}"
