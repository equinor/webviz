import os
import asyncio
from typing import Any, Optional

import httpx
import redis
from starlette.requests import Request
from starlette.responses import StreamingResponse
from starlette.background import BackgroundTask

from src import config
from src.services.utils.authenticated_user import AuthenticatedUser

LOCALHOST_DEVELOPMENT = os.environ.get("UVICORN_RELOAD") == "true"


class _RedisUserJobs:
    def __init__(self) -> None:
        # redis.Redis does not yet have namespace support - https://github.com/redis/redis-py/issues/12 - need to prefix manually.
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)

    def get_job_name(self, user_id: str) -> Optional[str]:
        return self._redis_client.get("user-job-name:" + user_id)

    def set_job_name(self, user_id: str, job_name: str) -> None:
        self._redis_client.set("user-job-name:" + user_id, job_name)


class RadixJobScheduler:
    """Utility class to help with spawning Radix jobs on demand,
    and provide correct URL to communicate with running Radix jobs"""

    def __init__(self, name: str, port: int) -> None:
        self._name = name
        self._port = port
        self._redis_user_jobs = _RedisUserJobs()

    def _get_job_name(self, user_id: str) -> Optional[str]:
        return self._redis_user_jobs.get_job_name(user_id)

    def _set_job_name(self, user_id: str, job_name: str) -> None:
        self._redis_user_jobs.set_job_name(user_id, job_name)

    async def _active_running_job(self, user_id: str) -> bool:
        """Returns true if there already is a running job for logged in user."""

        existing_job_name = self._get_job_name(user_id)
        if not existing_job_name:
            return False
        if LOCALHOST_DEVELOPMENT:
            return True

        async with httpx.AsyncClient() as client:
            res = await client.get(f"http://{self._name}:{self._port}/api/v1/jobs/{existing_job_name}")

        job = res.json()

        if job.get("status") != "Running" or not job.get("started"):
            return False

        try:
            httpx.get(f"http://{existing_job_name}:{self._port}/")
        except (ConnectionRefusedError, httpx.ConnectError, httpx.ConnectTimeout):
            print(f"User session container for user {user_id} not yet up.")
            return False

        return True

    async def _create_new_job(self, user_id: str) -> None:
        """Create a new Radix job by sending request to Radix job scheduler.
        If localhost development, simply return already running container with
        same name."""

        if LOCALHOST_DEVELOPMENT:
            self._set_job_name(user_id, self._name)
        else:
            print(f"Requesting new user session container for user {user_id}.")
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"http://{self._name}:{self._port}/api/v1/jobs",
                    # Maximum limits in "resources" for a Radix job is as of May 2023
                    # the specs of a single Standard_E16as_v4 node, i.e.:
                    #  * vCPU: 16
                    #  * memory: 128 GiB
                    #  * temp storage (SSD): 256 GiB
                    #
                    # As of now our CPU/memory requests are hardcoded below, but in the future maybe
                    # these could be dynamic based on e.g. the selected ensemble sizess by the user.
                    json={
                        "resources": {
                            "limits": {"memory": "32GiB", "cpu": "2"},
                            "requests": {"memory": "32GiB", "cpu": "1"},
                        }
                    },
                )
            self._set_job_name(user_id, res.json()["name"])

            while not await self._active_running_job(user_id):
                # It takes a couple of seconds before Radix job uvicorn process has
                # started and begins to listen at the end point.
                await asyncio.sleep(1)

    async def get_base_url(self, user_id: str) -> str:
        """Input is ID of logged in user. Returned value is base URL towards the correct
        Radix job"""
        if not await self._active_running_job(user_id):
            await self._create_new_job(user_id)

        job_name = self._get_job_name(user_id)

        return f"http://{job_name}:{self._port}"


# For now we only have one type of job:
RADIX_JOB_SCHEDULER_INSTANCE = RadixJobScheduler("backend-user-session", 8000)


async def proxy_to_user_session(request: Request, authenticated_user: AuthenticatedUser) -> Any:
    # Ideally this function should probably be a starlette/FastAPI middleware, but it appears that
    # it is not yet possible to put middleware on single routes through decorator like in express.js.

    base_url = await RADIX_JOB_SCHEDULER_INSTANCE.get_base_url(
        authenticated_user._user_id  # pylint: disable=protected-access
    )

    # See https://github.com/tiangolo/fastapi/discussions/7382:

    client = httpx.AsyncClient(base_url=base_url)

    url = httpx.URL(
        path=request.url.path.removeprefix("/api").rstrip("/"),
        query=request.url.query.encode("utf-8"),
    )

    job_req = client.build_request(
        request.method,
        url,
        headers=request.headers.raw,
        content=request.stream(),
        timeout=600,
    )
    job_resp = await client.send(job_req, stream=True)

    return StreamingResponse(
        job_resp.aiter_raw(),
        status_code=job_resp.status_code,
        headers=job_resp.headers,
        background=BackgroundTask(job_resp.aclose),
    )
