from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.group_tree.group_tree_assembler import (
    GroupTreeAssembler,
    NodeType,
    StatOptions,
    TreeModeOptions,
)
from primary.services.sumo_access.group_tree.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

from webviz_pkg.core_utils.perf_timer import PerfTimer
import logging

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/realization_group_tree_data/")
async def get_realization_group_tree_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    resampling_frequency: schemas.Frequency = Query(description="Resampling frequency"),
    node_type_set: set[schemas.NodeType] = Query(description="Node types"),
    # fmt:on
) -> schemas.GroupTreeData:
    timer = PerfTimer()

    grouptree_access = await GroupTreeAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "YEARLY")
    grouptree_data = GroupTreeAssembler(
        grouptree_access=grouptree_access,
        summary_access=summary_access,
        realization=realization,
        resampling_frequency=sumo_freq,
    )

    # Ensure no duplicate node types
    unique_node_types = list(set(node_type_set))

    timer.lap_ms()
    await grouptree_data.initialize_single_realization_data_async(realization=realization)
    initialize_time_ms = timer.lap_ms()

    dated_trees, edge_metadata, node_metadata = await grouptree_data.create_single_realization_group_tree_dataset(
        node_types=unique_node_types
    )
    create_group_tree_time = timer.lap_ms()

    LOGGER.info(
        f"Grouptree data for single realization fetched and processed in: {timer.elapsed_ms()}ms "
        f"(initialize={initialize_time_ms}ms, create_group_tree={create_group_tree_time}ms "
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
    resampling_frequency: schemas.Frequency = Query(description="Resampling frequency"),
    node_type_set: set[schemas.NodeType] = Query(description="Node types"),
    # fmt:on
) -> schemas.GroupTreeData:
    timer = PerfTimer()

    grouptree_access = await GroupTreeAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "YEARLY")

    grouptree_data = GroupTreeAssembler(
        grouptree_access=grouptree_access,
        summary_access=summary_access,
        resampling_frequency=sumo_freq,
    )
    await grouptree_data.initialize_statistics_data_async()

    # Ensure no duplicate node types
    unique_node_types = list(set(node_type_set))

    dated_trees, edge_metadata, node_metadata = await grouptree_data.create_statistics_group_tree_dataset(
        node_types=unique_node_types,
        stat_option=StatOptions[stat_option.value],
    )

    LOGGER.info(f"Grouptree data for statistics fetched and processed in: {timer.elapsed_ms()}ms")

    return schemas.GroupTreeData(
        edge_metadata_list=edge_metadata, node_metadata_list=node_metadata, dated_trees=dated_trees
    )
