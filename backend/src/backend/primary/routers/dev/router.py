import asyncio
import logging
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status

from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper
from src.services.utils.perf_timer import PerfTimer

from .dev_radix_helpers import create_new_radix_job
from .dev_radix_helpers import delete_all_radix_job_instances
from .dev_radix_helpers import get_all_radix_jobs, get_radix_job_state
from .dev_redis_user_job_dir import RedisUserJobDirectory
from .dev_user_jobs import get_or_create_user_service_url

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, kw_only=True)
class UserSessionServiceEntry:
    job_component_name: str     # The job's component name in radix, or the service name in docker compose, e.g. "user-mock"
    port: int                   # The port number for the radix job manager AND the actual port of the service. These must be the same for our current docker compose setup


AVAILABLE_USER_SESSION_SERVICES: dict[str, UserSessionServiceEntry] = {
    "mock": UserSessionServiceEntry(job_component_name="user-mock", port=8001),
    "grid3d": UserSessionServiceEntry(job_component_name="user-grid3d-ri", port=8002),
}


router = APIRouter()


@router.get("/usersession/{service_name}/radixlist")
async def usersession_radixlist(service_name: str) -> str:
    LOGGER.debug(f"usersession_radixlist() {service_name=}")

    entry = AVAILABLE_USER_SESSION_SERVICES[service_name]

    job_list = await get_all_radix_jobs(entry.job_component_name, entry.port)
    LOGGER.debug("---")
    LOGGER.debug(job_list)
    LOGGER.debug("---")
    return str(job_list)


@router.get("/usersession/{service_name}/radixcreate")
async def usersession_radixcreate(service_name: str) -> str:
    LOGGER.debug(f"usersession_radixcreate() {service_name=}")

    entry = AVAILABLE_USER_SESSION_SERVICES[service_name]

    new_radix_job_name = await create_new_radix_job(entry.job_component_name, entry.port)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    LOGGER.debug(f"Polling job until receiving running status: {new_radix_job_name=}")
    max_state_calls = 20
    for i in range(max_state_calls):
        radix_job_state = await get_radix_job_state(entry.job_component_name, entry.port, new_radix_job_name)
        status = radix_job_state.status if radix_job_state else "N/A"
        LOGGER.debug(f"Status: {status=}")
        await asyncio.sleep(0.1)

    return str(radix_job_state)


@router.get("/usersession/{service_name}/radixdelete")
async def usersession_radixdelete(service_name: str) -> str:
    LOGGER.debug(f"usersession_radixdelete() {service_name=}")

    entry = AVAILABLE_USER_SESSION_SERVICES[service_name]

    await delete_all_radix_job_instances(entry.job_component_name, entry.port)
    return "Delete done"


@router.get("/usersession/{service_name}/call")
async def usersession_call(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    service_name: Annotated[str, Path(description="Service name")],
    instance_str: Annotated[str, Query(description="Instance string")] = "myInst",
) -> str:
    LOGGER.debug(f"usersession_call() {service_name=}, {instance_str=}")

    timer = PerfTimer()

    entry = AVAILABLE_USER_SESSION_SERVICES[service_name]

    service_base_url = await get_or_create_user_service_url(
        authenticated_user._user_id, entry.job_component_name, entry.port, instance_str, entry.port
    )
    if service_base_url is None:
        LOGGER.error("Failed to get user session service URL")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get user session service URL"
        )

    LOGGER.debug(f"Call to get_or_create_user_service_url() took: {timer.elapsed_ms()}ms")

    endpoint = f"{service_base_url}/dowork?duration=5"

    LOGGER.debug("======================")
    LOGGER.debug(f"{service_base_url=}")
    LOGGER.debug(f"{endpoint=}")
    LOGGER.debug("======================")

    LOGGER.debug(f"before call to: {endpoint=}")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(endpoint)
        response.raise_for_status()

    LOGGER.debug(f"after call to: {endpoint=}")

    resp_text = response.text
    LOGGER.debug(f"{type(resp_text)=}")
    LOGGER.debug(f"{resp_text=}")

    return resp_text


@router.get("/usersession/dirlist")
async def usersession_dirlist(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    service_name: Annotated[str | None, Query(description="Service name")] = None,
) -> str:
    LOGGER.debug(f"usersession_dirlist() {service_name=}")

    job_component_name: str | None = None
    if service_name is not None:
        job_component_name = AVAILABLE_USER_SESSION_SERVICES[service_name].job_component_name

    job_dir = RedisUserJobDirectory(authenticated_user._user_id)
    job_info_arr = job_dir.get_job_info_arr(job_component_name)

    resp_text = ""

    LOGGER.debug("======================")
    for job_info in job_info_arr:
        LOGGER.debug(f"{job_info=}")
        resp_text += str(job_info) + "\n"
    LOGGER.debug("======================")

    return resp_text


@router.get("/usersession/dirdel")
async def usersession_dirdel(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    service_name: Annotated[str | None, Query(description="Service name")] = None,
) -> str:
    LOGGER.debug(f"usersession_dirdel() {service_name=}")

    job_component_name: str | None = None
    if service_name is not None:
        job_component_name = AVAILABLE_USER_SESSION_SERVICES[service_name].job_component_name

    job_dir = RedisUserJobDirectory(authenticated_user._user_id)
    job_dir.delete_job_info(job_component_name)

    job_info_arr = job_dir.get_job_info_arr(None)
    LOGGER.debug("======================")
    for job_info in job_info_arr:
        LOGGER.debug(f"{job_info=}")
    LOGGER.debug("======================")

    return "Job info deleted"
