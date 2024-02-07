from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query
from src.backend.auth.auth_helper import AuthHelper
from src.services.group_tree_data import GroupTreeData, NodeType, StatOptions, TreeModeOptions
from src.services.sumo_access.group_tree_access import GroupTreeAccess
from src.services.sumo_access.summary_access import Frequency, SummaryAccess
from src.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

router = APIRouter()


@router.get("/realization_group_tree_data/")
async def get_realization_group_tree_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency. If not specified, yearly data will be used.")] = None,
    # fmt:on
) -> schemas.GroupTreeData:
    grouptree_access = await GroupTreeAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "YEARLY")
    grouptree_data = GroupTreeData(
        grouptree_access=grouptree_access,
        summary_access=summary_access,
        realization=realization,
        resampling_frequency=sumo_freq,
    )
    await grouptree_data.initialize_data()

    dated_trees, edge_metadata, node_metadata = await grouptree_data.create_group_tree_dataset(
        tree_mode=TreeModeOptions.SINGLE_REAL,
        real=realization,
        node_types=[NodeType.PROD, NodeType.INJ, NodeType.OTHER],
        stat_option=None,
    )
    return schemas.GroupTreeData(
        edge_metadata_list=edge_metadata, node_metadata_list=node_metadata, dated_trees=dated_trees
    )


@router.get("/statistical_group_tree_data/")
async def get_statistical_group_tree_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    stat_option: schemas.StatOption = Query(description="Statistical option"),
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency. If not specified, yearly data will be used.")] = None,
    # fmt:on
) -> List:
    grouptree_access = await GroupTreeAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "YEARLY")

    grouptree_data = GroupTreeData(
        grouptree_access=grouptree_access,
        summary_access=summary_access,
        resampling_frequency=sumo_freq,
    )
    await grouptree_data.initialize_data()

    dated_trees, edge_metadata, node_metadata = await grouptree_data.create_group_tree_dataset(
        tree_mode=TreeModeOptions.STATISTICS,
        node_types=[NodeType.PROD, NodeType.INJ, NodeType.OTHER],
        stat_option=StatOptions[stat_option.value],
    )

    return schemas.GroupTreeData(
        edge_metadata_list=edge_metadata, node_metadata_list=node_metadata, dated_trees=dated_trees
    )
