from fastapi import APIRouter, Depends, Query
from primary.auth.auth_helper import AuthHelper
from primary.services.group_tree_assembler.group_tree_assembler import GroupTreeAssembler
from primary.services.sumo_access.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.group_tree_types import TreeModeOptions, NodeType
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

    group_tree_access = await GroupTreeAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    summary_frequency = Frequency.from_string_value(resampling_frequency.value)
    if summary_frequency is None:
        summary_frequency = Frequency.YEARLY

    # Convert to NodeType enum in group_tree_types
    unique_node_types = set([NodeType(elm.value) for elm in node_type_set])

    group_tree_data = GroupTreeAssembler(
        group_tree_access=group_tree_access,
        summary_access=summary_access,
        realization=realization,
        summary_frequency=summary_frequency,
        node_types=unique_node_types,
        group_tree_mode=TreeModeOptions.SINGLE_REAL,
    )

    timer.lap_ms()
    await group_tree_data.fetch_and_initialize_async()
    initialize_time_ms = timer.lap_ms()

    (
        dated_trees,
        edge_metadata,
        node_metadata,
    ) = await group_tree_data.create_dated_trees_and_metadata_lists()
    create_data_time_ms = timer.lap_ms()

    LOGGER.info(
        f"Group tree data for single realization fetched and processed in: {timer.elapsed_ms()}ms "
        f"(initialize={initialize_time_ms}ms, create group tree={create_data_time_ms}ms)"
    )

    return schemas.GroupTreeData(
        edge_metadata_list=edge_metadata, node_metadata_list=node_metadata, dated_trees=dated_trees
    )
