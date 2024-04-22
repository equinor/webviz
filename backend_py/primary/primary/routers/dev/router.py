import asyncio
import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Path

from primary.auth.auth_helper import AuthenticatedUser, AuthHelper
from primary.services.user_session_manager.user_session_manager import UserSessionManager
from primary.services.user_session_manager.user_session_manager import UserComponent
from primary.services.user_session_manager.user_session_manager import _USER_SESSION_DEFS
from primary.services.user_session_manager._radix_helpers import create_new_radix_job, RadixResourceRequests
from primary.services.user_session_manager._radix_helpers import get_all_radix_jobs, get_radix_job_state
from primary.services.user_session_manager._radix_helpers import delete_all_radix_jobs
from primary.services.user_session_manager._user_session_directory import UserSessionDirectory
from primary.services.user_session_manager._background_tasks import run_in_background_task

LOGGER = logging.getLogger(__name__)


router = APIRouter()


@router.get("/usersession/{user_component}/call")
async def usersession_call(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: Annotated[UserComponent, Path(description="User session component")],
    instance_str: Annotated[str, Query(description="Instance string")] = "myInst",
) -> str:
    LOGGER.debug(f"usersession_call() {user_component=}, {instance_str=}")

    manager = UserSessionManager(authenticated_user.get_user_id())
    session_base_url = await manager.get_or_create_session_async(user_component, instance_str)
    if session_base_url is None:
        LOGGER.error("Failed to get user session URL")
        raise HTTPException(status_code=500, detail="Failed to get user session URL")

    endpoint = f"{session_base_url}/dowork?duration=5"

    LOGGER.debug("======================")
    LOGGER.debug(f"{session_base_url=}")
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


@router.get("/usersession/{user_component}/radixlist")
async def usersession_radixlist(user_component: UserComponent) -> str:
    LOGGER.debug(f"usersession_radixlist() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]

    job_list = await get_all_radix_jobs(session_def.job_component_name, session_def.port)
    LOGGER.debug("---")
    LOGGER.debug(job_list)
    LOGGER.debug("---")
    return str(job_list)


@router.get("/usersession/{user_component}/radixcreate")
async def usersession_radixcreate(user_component: UserComponent) -> str:
    LOGGER.debug(f"usersession_radixcreate() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]

    resource_req = RadixResourceRequests(cpu="50m", memory="100Mi")
    new_radix_job_name = await create_new_radix_job(session_def.job_component_name, session_def.port, resource_req)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    LOGGER.debug(f"Polling job until receiving running status: {new_radix_job_name=}")
    max_state_calls = 20
    for _i in range(max_state_calls):
        radix_job_state = await get_radix_job_state(
            session_def.job_component_name, session_def.port, new_radix_job_name
        )
        session_status = radix_job_state.status if radix_job_state else "N/A"
        LOGGER.debug(f"Status: {session_status=}")
        await asyncio.sleep(0.1)

    return str(radix_job_state)


@router.get("/usersession/{user_component}/radixdelete")
async def usersession_radixdelete(user_component: UserComponent) -> str:
    LOGGER.debug(f"usersession_radixdelete() {user_component=}")

    session_def = _USER_SESSION_DEFS[user_component]

    await delete_all_radix_jobs(session_def.job_component_name, session_def.port)
    return "Delete done"


@router.get("/usersession/dirlist")
async def usersession_dirlist(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: UserComponent | None = None,
) -> str:
    LOGGER.debug(f"usersession_dirlist() {user_component=}")

    job_component_name: str | None = None
    if user_component is not None:
        job_component_name = _USER_SESSION_DEFS[user_component].job_component_name

    session_dir = UserSessionDirectory(authenticated_user.get_user_id())
    session_info_arr = session_dir.get_session_info_arr(job_component_name)

    resp_text = ""

    LOGGER.debug("======================")
    for session_info in session_info_arr:
        LOGGER.debug(f"{session_info=}")
        resp_text += str(session_info) + "\n"
    LOGGER.debug("======================")

    return resp_text


@router.get("/usersession/dirdel")
async def usersession_dirdel(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    user_component: UserComponent | None = None,
) -> str:
    LOGGER.debug(f"usersession_dirdel() {user_component=}")

    job_component_name: str | None = None
    if user_component is not None:
        job_component_name = _USER_SESSION_DEFS[user_component].job_component_name

    session_dir = UserSessionDirectory(authenticated_user.get_user_id())
    session_dir.delete_session_info(job_component_name)

    session_info_arr = session_dir.get_session_info_arr(None)
    LOGGER.debug("======================")
    for session_info in session_info_arr:
        LOGGER.debug(f"{session_info=}")
    LOGGER.debug("======================")

    return "Session info deleted"


@router.get("/bgtask")
async def bgtask() -> str:
    LOGGER.debug(f"bgtask() - start")

    async def funcThatThrows() -> None:
        raise ValueError("This is a test error")

    async def funcThatLogs(msg: str) -> None:
        LOGGER.debug(f"This is a test log {msg=}")

    run_in_background_task(funcThatThrows())
    run_in_background_task(funcThatLogs(msg="HELO HELLO"))

    LOGGER.debug(f"bgtask() - done")

    return "Background tasks were run"
