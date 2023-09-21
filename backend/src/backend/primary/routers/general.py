import datetime
import logging

import starsessions
from starlette.responses import StreamingResponse
from fastapi import APIRouter, HTTPException, Request, status, Depends, Query
from pydantic import BaseModel
# Using the same http client as sumo
import httpx
import base64

from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser
from src.backend.primary.user_session_proxy import proxy_to_user_session

LOGGER = logging.getLogger(__name__)


class UserInfo(BaseModel):
    username: str
    avatar_b64str: str | None
    has_sumo_access: bool
    has_smda_access: bool

class UserAvatar(BaseModel):
    avatar: bytes

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
async def logged_in_user(request: Request, includeAvatar: bool = Query(False, description="Set to true to include user avatar from Microsoft GRAPH Api")) -> UserInfo:
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
        has_sumo_access=authenticated_user.has_sumo_access_token(),
        has_smda_access=authenticated_user.has_smda_access_token(),
    )

    if includeAvatar:
        headers = { "Authorization": f"Bearer {authenticated_user.get_graph_access_token()}" }
        async with httpx.AsyncClient() as client:
            result = await client.get("https://graph.microsoft.com/v1.0/me/photo/$value", headers=headers)
            if result.status_code == 200:
                user_info.avatar_b64str = base64.b64encode(result.content)

    return user_info

@router.get("/user_session_container")
async def user_session_container(
    request: Request, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> StreamingResponse:
    """Get information about user session container (note that one is started if not already running)."""
    return await proxy_to_user_session(request, authenticated_user)
