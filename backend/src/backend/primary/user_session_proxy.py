import os
import asyncio
from typing import Dict, Any

import httpx
from starlette.requests import Request
from starlette.responses import StreamingResponse
from starlette.background import BackgroundTask

from src.services.utils.authenticated_user import AuthenticatedUser

LOCALHOST_DEVELOPMENT = os.environ.get("UVICORN_RELOAD") == "true"


class RadixJobScheduler:
    """Utility class to help with spawning Radix jobs on demand,
    and provide correct URL to communicate with running Radix jobs"""

    def __init__(self, name: str, port: int) -> None:
        self._name = name
        self._port = port

        # This should be moved to Redis - https://github.com/equinor/webviz/issues/357
        # key: user_id, value: name of Radix job instance
        self._existing_job_names: Dict[str, str] = {}

    async def _active_running_job(self, user_id: str) -> bool:
        """Returns true if there already is a running job for logged in user."""

        existing_job_name = self._existing_job_names.get(user_id)
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
            print("User container server not yet up")
            return False

        return True

    async def _create_new_job(self, user_id: str) -> None:
        """Create a new Radix job by sending request to Radix job scheduler.
        If localhost development, simply return already running container with
        same name."""

        if LOCALHOST_DEVELOPMENT:
            self._existing_job_names[user_id] = self._name
        else:
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
            self._existing_job_names[user_id] = res.json()["name"]

            while not await self._active_running_job(user_id):
                # It takes a couple of seconds before Radix job uvicorn process has
                # started and begins to listen at the end point.
                await asyncio.sleep(1)

    async def get_base_url(self, user_id: str) -> str:
        """Input is ID of logged in user. Returned value is base URL towards the correct
        Radix job"""
        if not await self._active_running_job(user_id):
            await self._create_new_job(user_id)

        job_name = self._existing_job_names[user_id]

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
