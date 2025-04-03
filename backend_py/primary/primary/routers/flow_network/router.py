import logging
from fastapi import APIRouter, Depends, Query
from webviz_pkg.core_utils.perf_timer import PerfTimer
from primary.auth.auth_helper import AuthHelper

from primary.services.flow_network_assembler.flow_network_assembler import FlowNetworkAssembler
from primary.services.flow_network_assembler.flow_network_types import NetworkModeOptions, NodeType
from primary.services.sumo_access.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/realization_flow_network/")
async def get_realization_flow_network(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
    resampling_frequency: schemas.Frequency = Query(description="Resampling frequency"),
    node_type_set: set[schemas.NodeType] = Query(description="Node types"),
    # fmt:on
) -> schemas.FlowNetworkData:
    timer = PerfTimer()

    group_tree_access = GroupTreeAccess.from_iteration_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_access = SummaryAccess.from_iteration_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    summary_frequency = Frequency.from_string_value(resampling_frequency.value)
    if summary_frequency is None:
        summary_frequency = Frequency.YEARLY

    # Convert to NodeType enum in group_tree_types
    unique_node_types = {NodeType(elm.value) for elm in node_type_set}

    network_assembler = FlowNetworkAssembler(
        group_tree_access=group_tree_access,
        summary_access=summary_access,
        realization=realization,
        summary_frequency=summary_frequency,
        selected_node_types=unique_node_types,
        flow_network_mode=NetworkModeOptions.SINGLE_REAL,
    )

    timer.lap_ms()
    await network_assembler.fetch_and_initialize_async()
    initialize_time_ms = timer.lap_ms()

    (
        dated_networks,
        edge_metadata,
        node_metadata,
    ) = network_assembler.create_dated_networks_and_metadata_lists()
    create_data_time_ms = timer.lap_ms()

    LOGGER.info(
        f"Group tree data for single realization fetched and processed in: {timer.elapsed_ms()}ms "
        f"(initialize={initialize_time_ms}ms, create group tree={create_data_time_ms}ms)"
    )

    return schemas.FlowNetworkData(
        edgeMetadataList=edge_metadata, nodeMetadataList=node_metadata, datedNetworks=dated_networks
    )
