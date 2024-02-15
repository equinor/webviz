import asyncio
import datetime
import logging
import json
from typing import Annotated

import httpx
import starsessions
from starlette.responses import StreamingResponse
from fastapi import APIRouter, HTTPException, Request, status, Depends, Query
from pydantic import BaseModel

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
                        "limits": {"memory": "1GiB", "cpu": "1"},
                        "requests": {"memory": "1GiB", "cpu": "1"},
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
                resp_text = call_endpoint_with_retries(call_url)

            return json.dumps(info) + "\n" + resp_text

    return "Unknown command"


async def call_health_endpoint(client: httpx.AsyncClient, call_url: str) -> str:
    print(f"############################# calling {call_url=}")
    try:
        response = httpx.get(call_url)
        response.raise_for_status()
    except httpx.RequestError as exc:
        print(f"An error occurred while requesting {exc.request.url!r}.")
        return None
    except httpx.HTTPStatusError as exc:
        print(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
        return None

    resp_text = response.text()
    print("------")
    print(resp_text)
    print("------")

    return resp_text


async def call_endpoint_with_retries(call_url: str) -> str | None:
    print(f"############################# call_endpoint_with_retries() with {call_url=}")
    max_retries = 10
    async with httpx.AsyncClient() as client:
        for i in range(max_retries):
            resp_text = await call_health_endpoint(client, call_url)
            if resp_text is not None:
                print(f"############################# call_endpoint_with_retries() SUCCESS with {call_url=}")
                return resp_text

            await asyncio.sleep(1)

    print(f"############################# call_endpoint_with_retries() FAILED with {call_url=}")
    return None
