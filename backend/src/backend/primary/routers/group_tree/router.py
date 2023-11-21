from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from src.backend.auth.auth_helper import AuthHelper
from src.services.group_tree_data import (GroupTreeData, NodeType, StatOptions,
                                          TreeModeOptions)
from src.services.sumo_access.group_tree_access import GroupTreeAccess
from src.services.sumo_access.summary_access import Frequency, SummaryAccess
from src.services.utils.authenticated_user import AuthenticatedUser

router = APIRouter()


@router.get("/group_tree_data/")
async def get_group_tree_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: Optional[int] = Query(None, description="Optional realization to include. If not specified, all realizations will be returned."),
    # fmt:on
) -> List:
    grouptree_access = await GroupTreeAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    grouptree_data = GroupTreeData(
        grouptree_access, summary_access, realization=realization, excl_well_startswith=["R_"]
    )
    await grouptree_data.initialize_data()

    data = await grouptree_data.create_group_tree_dataset(
        tree_mode=TreeModeOptions.SINGLE_REAL,
        real=0,
        node_types=[NodeType.PROD, NodeType.INJ, NodeType.OTHER],
        stat_option=None,
    )
    # print(data)
    return data
