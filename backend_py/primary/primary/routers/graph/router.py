import logging

import httpx
from fastapi import APIRouter, Depends, Query, Path

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.graph_access.graph_access import GraphApiAccess
from primary.services.service_exceptions import Service, AuthorizationError, ServiceRequestError


from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user_info/{user_id_or_email}")
async def get_user_info(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    user_id_or_email: str = Path(description="User email, id or 'me' for the authenticated user"),
) -> schemas.GraphUser | None:
    if not authenticated_user.has_graph_access_token():
        raise AuthorizationError("User can't access Graph API", Service.GENERAL)

    graph_api_access = GraphApiAccess(authenticated_user.get_graph_access_token())

    try:
        user_info = await graph_api_access.get_user_info(user_id_or_email)

        if not user_info:
            return None

        return schemas.GraphUser(
            id=user_info["id"],
            display_name=user_info["displayName"],
            principal_name=user_info["userPrincipalName"],
            email=user_info["mail"],
        )

    except httpx.HTTPError as exc:
        raise ServiceRequestError(
            "Error while fetching user from Microsoft Graph API (HTTP error)", Service.GENERAL
        ) from exc
    except httpx.InvalidURL as exc:
        raise ServiceRequestError(
            "Error while fetching user from Microsoft Graph API (HTTP error)", Service.GENERAL
        ) from exc


@router.get("/user_photo/")
async def get_user_photo(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    user_id_or_email: str = Query(description="User email or 'me' for the authenticated user"),
    # fmt:on
) -> schemas.GraphUserPhoto:
    """Get username, display name and avatar from Microsoft Graph API for a given user email"""

    user_photo = schemas.GraphUserPhoto(
        avatar_b64str=None,
    )

    if authenticated_user.has_graph_access_token():
        graph_api_access = GraphApiAccess(authenticated_user.get_graph_access_token())
        try:
            avatar_b64str = await graph_api_access.get_user_profile_photo(user_id_or_email)

            user_photo.avatar_b64str = avatar_b64str
        except httpx.HTTPError as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (HTTP error):\n", exc)
        except httpx.InvalidURL as exc:
            print("Error while fetching user avatar and info from Microsoft Graph API (Invalid URL):\n", exc)

    # Return 404 if no user info was found?
    return user_photo
