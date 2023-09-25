from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from src.backend.auth.auth_helper import AuthHelper
from src.services.utils.authenticated_user import AuthenticatedUser

from src.services.sumo_access.well_completions_access import WellCompletionsAccess
from src.services.sumo_access.well_completions_types import WellCompletionsData

router = APIRouter()


@router.get("/well_completions_data/")
def get_well_completions_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: Optional[int] = Query(None, description="Optional realization to include. If not specified, all realizations will be returned."),
    # fmt:on
) -> WellCompletionsData:
    access = WellCompletionsAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    well_completions_data = access.get_well_completions_data(realization=realization)

    if not well_completions_data:
        raise HTTPException(status_code=404, detail="Well completions data not found")

    return well_completions_data