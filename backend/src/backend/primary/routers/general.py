import asyncio
import datetime
import logging
import json
import os
from typing import Annotated, List

import httpx
import starsessions
from starlette.responses import StreamingResponse
from fastapi import APIRouter, HTTPException, Request, status, Depends, Query
from pydantic import BaseModel

import redis

from src import config
from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser
from src.backend.primary.user_session_proxy import proxy_to_user_session
from src.services.graph_access.graph_access import GraphApiAccess

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


@router.get("/user_mock")
async def user_mock(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    cmd: Annotated[str, Query(description="Command")] = None
) -> str:

    print(f"{cmd=}")

    if cmd is None:
        return "No command given"

    base_url = "http://user-mock:8001/api/v1/jobs"

    if cmd == "list":
        async with httpx.AsyncClient() as client:
            res = await client.get(base_url)
            info = res.json()
            print(info)

            return json.dumps(info)

    if cmd == "create" or cmd == "create-call":
        async with httpx.AsyncClient() as client:
            res = await client.post(
                base_url,
                json={
                    "resources": {
                        "limits": {"memory": "500M", "cpu": "100m"},
                        "requests": {"memory": "500M", "cpu": "100m"},
                    }
                },
            )
            info = res.json()
            print("------")
            print(info)
            print("------")

            resp_text = "nada"
            if cmd == "create-call":
                job_name = info["name"]
                print(f"#############################{job_name=}")
                call_url = f"http://{job_name}:8001"
                print(f"#############################{call_url=}")
                resp_text = await call_endpoint_with_retries(call_url)

            return json.dumps(info) + "\n" + resp_text

    return "Unknown command"


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


@router.get("/delete")
async def delete_func(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)]
) -> str:
    await delete_all_radix_job_instances("user-mock", 8001)
    return "Delete done"




IS_RUNNING_IN_RADIX = True if os.getenv("RADIX_APP") is not None else False
print(f"{IS_RUNNING_IN_RADIX=}")


def make_job_endpoint_url(radix_job_name: str) -> str:
    return f"http://{radix_job_name}:8001"


async def get_or_create_user_service_url(user_id: str, job_component_name: str, instance_identifier: str) -> str:
    redis_user_jobs = _RedisUserJobManager(user_id)
    job_info = redis_user_jobs.get_job_info(job_component_name, instance_identifier)
    if job_info is not None:
        print("##### Found a job, returning URL")
        print(f"{job_info=}")
        return make_job_endpoint_url(job_info.radix_job_name)

    print("##### Did not find job, creating it")

    job_info = JobInfo(state=JobState.CREATING_RADIX_JOB, radix_job_name=None)
    redis_user_jobs.set_job_info(job_component_name, instance_identifier, job_info)

    async with httpx.AsyncClient() as client:
        if IS_RUNNING_IN_RADIX:
            print("##### Creating job in radix")
            radix_job_manager_url = f"http://{job_component_name}:8001/api/v1/jobs"
            response = await client.post(
                url=radix_job_manager_url,
                json={
                    "resources": {
                        "limits": {"memory": "500M", "cpu": "100m"},
                        "requests": {"memory": "500M", "cpu": "100m"},
                    }
                },
            )

            response_dict = response.json() 
            print("------")
            print(response_dict)
            print("------")

            print("##### Radix job created, will try and wait for it to come alive")

            radix_job_name = response_dict["name"]
            job_info.radix_job_name = radix_job_name
            job_info.state = JobState.RUNNING_NOT_READY
            redis_user_jobs.set_job_info(job_component_name, instance_identifier, job_info)
        else:
            print("##### Running locally, will not create radix job")
            job_info.radix_job_name = job_component_name
            job_info.state = JobState.RUNNING_NOT_READY
            redis_user_jobs.set_job_info(job_component_name, instance_identifier, job_info)

        call_url = make_job_endpoint_url(job_info.radix_job_name)
        resp_text = await call_endpoint_with_retries(call_url)

        if resp_text is not None:
            job_info.state = JobState.RUNNING_READY
            redis_user_jobs.set_job_info(job_component_name, instance_identifier, job_info)

    if job_info.state == JobState.RUNNING_READY:
        return make_job_endpoint_url(job_info.radix_job_name)
    
    return None


async def delete_all_radix_job_instances(job_component_name: str, job_schedulerPort: int) -> None:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://{job_component_name}:{job_schedulerPort}/api/v1/jobs")
        response.raise_for_status()
        job_list = response.json()
        for job in job_list:
            job_name = job["name"]
            print(f"------Deleting job {job_name}")
            response = await client.delete(f"http://{job_component_name}:{job_schedulerPort}/api/v1/jobs/{job_name}")
            response.raise_for_status()
            print(f"------Deleted job {job_name} --- {response.text}")


from enum import Enum

class JobState(str, Enum):
    CREATING_RADIX_JOB = "CREATING_RADIX_JOB"
    RUNNING_NOT_READY = "RUNNING_NOT_READY"
    RUNNING_READY = "RUNNING_READY"


class JobInfo(BaseModel):
    state: JobState
    radix_job_name: str | None


class _RedisUserJobManager:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)

    def set_job_info(self, job_component_name: str, instance_identifier: str, job_info: JobInfo) -> None:
        key = self._make_key(job_component_name, instance_identifier)
        payload = job_info.model_dump_json()
        print(f"{type(payload)=}")
        print(f"{payload=}")

        self._redis_client.set(key, payload)

    def get_job_info(self, job_component_name: str, instance_identifier: str) -> JobInfo | None:
        key = self._make_key(job_component_name, instance_identifier)
        payload = self._redis_client.get(key)
        if payload is None:
            return None
        
        print(f"{type(payload)=}")
        print(f"{payload=}")
        info = JobInfo.model_validate_json(payload)
        print(f"{type(info)=}")
        print(f"{info=}")
        return info

    def get_job_info_arr(self, job_component_name: str) -> List[JobInfo]:
        #pattern = f"user-jobs:{self._user_id}:{job_component_name}:*"
        pattern = f"user-jobs:*:{job_component_name}:*"
        print(f"{pattern=}")
        
        ret_list = []
        for key in self._redis_client.scan_iter(pattern):
            print(f"{key=}")
            payload = self._redis_client.get(key)
            print(f"{payload=}")
            info = JobInfo.model_validate_json(payload)
            ret_list.append(info)

        return ret_list

    def _make_key(self, job_component_name: str, instance_identifier: str) -> str:
        return f"user-jobs:{self._user_id}:{job_component_name}:{instance_identifier}"


