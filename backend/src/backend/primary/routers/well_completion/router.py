from fastapi import APIRouter, Depends, Query

import os
import json

from src.backend.auth.auth_helper import AuthHelper
from src.services.utils.authenticated_user import AuthenticatedUser

from .schemas import WellCompletionData

router = APIRouter()


@router.get("/well_completion_data/")
def get_well_completion_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization number"),
    # fmt:on
) -> WellCompletionData:
    # Load test data from json file for now
    # Awaiting loading well completion data from Sumo
    current_folder_path = os.path.abspath(os.path.dirname(__file__))
    well_completion_data_file_path = os.path.join(current_folder_path, "tmp_test_data/well-completions.json")

    with open(well_completion_data_file_path) as well_completion_data_file:
        return WellCompletionData(json_data=json.load(well_completion_data_file))

    return WellCompletionData(json_data={})
