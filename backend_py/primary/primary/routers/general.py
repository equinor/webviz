import asyncio
import datetime
import logging

import httpx
import starsessions
from fastapi import APIRouter, HTTPException, Request, status, Query
from pydantic import BaseModel

from primary.auth.auth_helper import AuthHelper
from primary.services.graph_access.graph_access import GraphApiAccess

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
