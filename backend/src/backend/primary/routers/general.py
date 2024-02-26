import asyncio
import datetime
import logging
from typing import Annotated

import httpx
import starsessions
from starlette.responses import StreamingResponse
from fastapi import APIRouter, HTTPException, Request, status, Depends, Query
from pydantic import BaseModel

from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser
from src.backend.primary.user_session_proxy import proxy_to_user_session
from src.services.graph_access.graph_access import GraphApiAccess

from .dev_radix_helpers import get_all_radix_jobs
from .dev_radix_helpers import create_new_radix_job
from .dev_radix_helpers import get_radix_job_state
from .dev_radix_helpers import delete_all_radix_job_instances
from .dev_user_jobs import get_or_create_user_service_url
from .dev_user_jobs import call_health_endpoint_with_retries
from .dev_redis_user_job_dir import RedisUserJobDirectory
from src.services.utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


class UserInfo(BaseModel):
    username: str
    display_name: str | None = None
    avatar_b64str: str | None = None
    has_sumo_access: bool
    has_smda_access: bool


router = APIRouter()


@router.get("/alive")
def alive() -> str:
    print("entering alive route")
    return f"ALIVE: Backend is alive at this time: {datetime.datetime.now()}"


@router.get("/alive_protected")
def alive_protected() -> str:
    print("entering alive_protected route")
    return f"ALIVE_PROTECTED: Backend is alive at this time: {datetime.datetime.now()}"


@router.get("/logged_in_user", response_model=UserInfo)
async def logged_in_user(
    request: Request,
    includeGraphApiInfo: bool = Query(  # pylint: disable=invalid-name
        False, description="Set to true to include user avatar and display name from Microsoft Graph API"
    ),
) -> UserInfo:
    print("entering logged_in_user route")

    await starsessions.load_session(request)
    authenticated_user = AuthHelper.get_authenticated_user(request)
    print(f"{authenticated_user=}")
    if not authenticated_user:
        # What is the most appropriate return code?
        # Probably 401, but seemingly we got into trouble with that. Should try again
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user is logged in")

    user_info = UserInfo(
        username=authenticated_user.get_username(),
        avatar_b64str=None,
        display_name=None,
        has_sumo_access=authenticated_user.has_sumo_access_token(),
        has_smda_access=authenticated_user.has_smda_access_token(),
    )

    if authenticated_user.has_graph_access_token() and includeGraphApiInfo:
        graph_api_access = GraphApiAccess(authenticated_user.get_graph_access_token())
        try:
            avatar_b64str_future = asyncio.create_task(graph_api_access.get_user_profile_photo("me"))
            graph_user_info_future = asyncio.create_task(graph_api_access.get_user_info("me"))

            avatar_b64str = await avatar_b64str_future
            graph_user_info = await graph_user_info_future

            user_info.avatar_b64str = avatar_b64str
            if graph_user_info is not None:
                user_info.display_name = graph_user_info.get("displayName", None)
        except httpx.HTTPError as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (HTTP error):\n", exc)
        except httpx.InvalidURL as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (Invalid URL):\n", exc)

    return user_info


@router.get("/user_session_container")
async def user_session_container(
    request: Request, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> StreamingResponse:
    """Get information about user session container (note that one is started if not already running)."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Temporarily disabled!!")
    #return await proxy_to_user_session(request, authenticated_user)


@router.get("/usermock/list")
async def usermock_list(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_list()")

    job_list = await get_all_radix_jobs("user-mock", 8001)
    LOGGER.debug("---")
    LOGGER.debug(job_list)
    LOGGER.debug("---")
    return str(job_list)


@router.get("/usermock/create")
async def usermock_create(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_create()")

    new_radix_job_name = await create_new_radix_job("user-mock", 8001)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    LOGGER.debug(f"Polling job until receiving running status: {new_radix_job_name=}")
    max_state_calls = 20
    for i in range(max_state_calls):
        radix_job_state = await get_radix_job_state("user-mock", 8001, new_radix_job_name)
        status = radix_job_state.status if radix_job_state else "N/A"
        LOGGER.debug(f"Status: {status=}")
        await asyncio.sleep(0.1)

    return str(radix_job_state)


@router.get("/usermock/createcall")
async def usermock_createcall(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_createcall()")

    new_radix_job_name = await create_new_radix_job("user-mock", 8001)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    call_url = f"http://{new_radix_job_name}:8001/health/ready"
    LOGGER.debug(f"=========== {call_url=}")
    success, msg_txt = await call_health_endpoint_with_retries(call_url, stop_after_delay_s=30)
    LOGGER.debug(f"===========  {success=}, {msg_txt=}")

    return f"{success=}, {msg_txt=}"


@router.get("/usermock/delete")
async def usermock_delete(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)]
) -> str:
    LOGGER.debug(f"usermock_delete()")

    await delete_all_radix_job_instances("user-mock", 8001)
    return "Delete done"


@router.get("/usermock/call")
async def usermock_call(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    instance_str: Annotated[str, Query(description="Instance string")] = "myInst",
) -> str:
    LOGGER.debug(f"usermock_call()  with {instance_str=}")

    timer = PerfTimer()

    service_base_url = await get_or_create_user_service_url(authenticated_user._user_id, "user-mock", instance_str)
    if service_base_url is None:
        LOGGER.error("Failed to get user session service URL")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get user session service URL")

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


@router.get("/usermock/dirlist")
async def usermock_dirlist(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_dirlist()")

    job_dir = RedisUserJobDirectory(authenticated_user._user_id)
    job_info_arr = job_dir.get_job_info_arr(None)

    resp_text = ""

    LOGGER.debug("======================")
    for job_info in job_info_arr:
        LOGGER.debug(f"{job_info=}")
        resp_text += str(job_info) + "\n"
    LOGGER.debug("======================")

    return resp_text


@router.get("/usermock/dirdel")
async def usermock_dirdel(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_dirdel()")

    job_dir = RedisUserJobDirectory(authenticated_user._user_id)

    job_dir.delete_job_info(None)
    
    job_info_arr = job_dir.get_job_info_arr(None)
    LOGGER.debug("======================")
    for job_info in job_info_arr:
        LOGGER.debug(f"{job_info=}")
    LOGGER.debug("======================")

    return "Job info deleted"








"""


@router.get("/test")
async def test_func(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)]
) -> str:
    redis_user_jobs = _RedisUserJobManager("AA123")
    redis_user_jobs.set_job_info("user-mock", "myinst_1A", JobInfo(state=JobState.RUNNING_READY, radix_job_name="Auser-mock_111"))
    redis_user_jobs.set_job_info("user-mock", "myinst_2A", JobInfo(state=JobState.RUNNING_READY, radix_job_name="Auser-mock_222"))
    redis_user_jobs.set_job_info("user-mock", "myinst_3A", JobInfo(state=JobState.RUNNING_READY, radix_job_name="Auser-mock_333"))

    redis_user_jobs = _RedisUserJobManager(authenticated_user._user_id)
    redis_user_jobs.set_job_info("user-mock", "myinst_1", JobInfo(state=JobState.RUNNING_READY, radix_job_name="user-mock_111"))
    redis_user_jobs.set_job_info("user-mock", "myinst_2", JobInfo(state=JobState.RUNNING_READY, radix_job_name="user-mock_222"))
    redis_user_jobs.set_job_info("user-mock", "myinst_3", JobInfo(state=JobState.RUNNING_READY, radix_job_name="user-mock_333"))
    
    info_arr = redis_user_jobs.get_job_info_arr("user-mock")
    print(f"{info_arr=}")

    ret_str = f"User jobs: {info_arr}"
    return ret_str


"""



