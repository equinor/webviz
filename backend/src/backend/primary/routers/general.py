import asyncio
import datetime
import logging
import json
from typing import Annotated, List

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
    return await proxy_to_user_session(request, authenticated_user)


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
    LOGGER.debug(f"usermock_list()")

    new_radix_job_name = await create_new_radix_job("user-mock", 8001)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    radix_job_state = await get_radix_job_state("user-mock", 8001, new_radix_job_name)
    LOGGER.debug("---")
    LOGGER.debug(f"{radix_job_state=}")
    LOGGER.debug("---")

    return str(radix_job_state)


@router.get("/usermock/call")
async def usermock_call(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
) -> str:
    LOGGER.debug(f"usermock_call()")
    new_radix_job_name = await create_new_radix_job("user-mock", 8001)
    LOGGER.debug(f"Created new job: {new_radix_job_name=}")
    if new_radix_job_name is None:
        return "Failed to create new job"

    max_state_calls = 5
    for i in range(max_state_calls):
        radix_job_state = await get_radix_job_state("user-mock", 8001, new_radix_job_name)
        LOGGER.debug("---")
        LOGGER.debug(f"{radix_job_state=}")
        LOGGER.debug("---")
        await asyncio.sleep(0.2)

    call_url = f"http://{new_radix_job_name}:8001"
    LOGGER.debug(f"#############################{call_url=}")
    resp_text = await call_endpoint_with_retries(call_url)

    return str(radix_job_state) + "\n" + str(resp_text)


@router.get("/usermock/delete")
async def usermock_delete(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)]
) -> str:
    await delete_all_radix_job_instances("user-mock", 8001)
    return "Delete done"



async def call_health_endpoint(client: httpx.AsyncClient, call_url: str) -> str:
    print(f"############################# calling {call_url=}")
    try:
        response = await client.get(call_url)
        response.raise_for_status()
    except httpx.RequestError as exc:
        print(f"An error occurred while requesting {exc.request.url!r}.")
        return None
    except httpx.HTTPStatusError as exc:
        print(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
        return None

    resp_text = response.text
    print("------")
    print(resp_text)
    print("------")

    return resp_text


async def call_endpoint_with_retries(call_url: str) -> str | None:
    print(f"############################# call_endpoint_with_retries() with {call_url=}")
    max_retries = 20
    async with httpx.AsyncClient() as client:
        for i in range(max_retries):
            resp_text = await call_health_endpoint(client, call_url)
            if resp_text is not None:
                print(f"############################# call_endpoint_with_retries() SUCCESS with {call_url=}")
                print(f"############################# call_endpoint_with_retries() info {resp_text=}")
                return resp_text

            await asyncio.sleep(1)

    print(f"############################# call_endpoint_with_retries() FAILED with {call_url=}")
    return None




"""

@router.get("/job")
async def user_mock(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)]
) -> str:
    
    service_base_url = await get_or_create_user_service_url(authenticated_user._user_id, "user-mock", "myinst")
    print("======================")
    print(f"{service_base_url=}")
    print("======================")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{service_base_url}/health/ready")
        response.raise_for_status()

    resp_text = response.text
    print(f"{type(resp_text)=}")
    print(f"{resp_text=}")

    return resp_text



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



