import logging

import httpx
from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.graph_access.graph_access import GraphApiAccess

from .schemas import GraphUserPhoto

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user_photo/")
async def user_info(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    user_id: str = Query(description="User id"),
    # fmt:on
) -> GraphUserPhoto:
    """Get username, display name and avatar from Microsoft Graph API for a given user id"""

    user_photo = GraphUserPhoto(
        avatar_b64str=None,
    )

    if authenticated_user.has_graph_access_token():
        graph_api_access = GraphApiAccess(authenticated_user.get_graph_access_token())
        try:
            avatar_b64str = await graph_api_access.get_user_profile_photo(user_id)

            user_photo.avatar_b64str = avatar_b64str
        except httpx.HTTPError as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (HTTP error):\n", exc)
        except httpx.InvalidURL as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (Invalid URL):\n", exc)

    # Return 404 if no user info was found?
    return user_photo
