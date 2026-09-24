import logging

from fastapi import APIRouter, Depends

from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.services.tutorial_media.tutorial_media_signer import TutorialMediaSignerSingleton

from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/media_sas_token")
async def get_media_sas_token(
    # Auth dependency enforces that only logged-in users can obtain a SAS token.
    _authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.TutorialMediaSasToken:
    """Return a short-lived, read-only container SAS token for fetching tutorial media."""
    sas_token = await TutorialMediaSignerSingleton.get_instance().get_container_read_sas_token_async()
    return schemas.TutorialMediaSasToken(sasToken=sas_token)
