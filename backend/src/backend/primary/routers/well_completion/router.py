from typing import Optional

from fastapi import APIRouter, Depends, Query

from src.backend.auth.auth_helper import AuthHelper
from src.services.utils.authenticated_user import AuthenticatedUser

from src.services.sumo_access.well_completion_access import WellCompletionAccess
from src.services.utils.well_completion_utils import WellCompletionDataModel

from . import schemas

router = APIRouter()


@router.get("/well_completion_data/")
def get_well_completion_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: Optional[int] = Query(None, description="Optional realization to include. If not specified, all realizations will be returned."),
    # fmt:on
) -> schemas.WellCompletionData:
    access = WellCompletionAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    well_completion_df = access.get_well_completion_data(realization=realization)
    well_completion_data_model = WellCompletionDataModel(well_completion_df)

    return schemas.WellCompletionData(json_data=well_completion_data_model.create_well_completion_dataset())
