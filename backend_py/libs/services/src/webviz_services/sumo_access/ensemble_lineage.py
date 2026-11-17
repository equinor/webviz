import asyncio
import logging
from dataclasses import dataclass

from sumo.wrapper import SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import ServiceLayerException

from ._helpers import create_sumo_case_async
from .queries.ensemble_restart import (
    EnsembleRestartDoc,
    find_ensemble_restart_doc_by_name_async,
    find_ensemble_restart_doc_by_uuid_async,
    get_restart_from_per_ensemble_async,
)

LOGGER = logging.getLogger(__name__)

MAX_RESTART_CHAIN_DEPTH = 10


def format_ensemble_label(case_name: str, ensemble_name: str) -> str:
    """User-facing label of an ensemble"""
    return f"{case_name}/{ensemble_name}"


@dataclass(frozen=True)
class ResolvedEnsemble:
    ensemble_uuid: str
    case_uuid: str
    case_name: str
    ensemble_name: str

    @property
    def label(self) -> str:
        return format_ensemble_label(self.case_name, self.ensemble_name)


@dataclass(frozen=True)
class RestartChain:
    ensemble: ResolvedEnsemble | None  # the ensemble itself, None if it has no realization documents
    ancestors: list[ResolvedEnsemble]  # nearest parent first
    unresolved_ensemble_uuid: str | None  # set if the chain broke on a uuid we could not resolve
    truncated: bool  # depth cap or cycle hit


@dataclass(frozen=True)
class EnsembleRestartInfo:
    ensemble_name: str
    restart_from: ResolvedEnsemble | None
    restart_from_unresolved_uuid: str | None


def _to_resolved_ensemble(doc: EnsembleRestartDoc) -> ResolvedEnsemble:
    return ResolvedEnsemble(
        ensemble_uuid=doc.ensemble_uuid,
        case_uuid=doc.case_uuid,
        case_name=doc.case_name,
        ensemble_name=doc.ensemble_name,
    )


async def resolve_ensemble_by_uuid_async(sumo_client: SumoClient, ensemble_uuid: str) -> ResolvedEnsemble | None:
    """Resolve an ensemble uuid to case uuid/name and ensemble name.

    Returns None if the ensemble cannot be found, which in Sumo is indistinguishable from the user not having access.
    """
    doc = await find_ensemble_restart_doc_by_uuid_async(sumo_client, ensemble_uuid)
    return _to_resolved_ensemble(doc) if doc is not None else None


async def get_restart_chain_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str) -> RestartChain:
    """Follow restart_from recursively, returning the ancestors nearest parent first.

    Stops when an ensemble is not a restart, when a uuid cannot be resolved, on a cycle, or when
    MAX_RESTART_CHAIN_DEPTH ancestors have been collected and the last one is itself a restart.
    """
    perf_metrics = PerfMetrics()

    ancestors: list[ResolvedEnsemble] = []
    unresolved_ensemble_uuid: str | None = None
    truncated = False

    own_doc = await find_ensemble_restart_doc_by_name_async(sumo_client, case_uuid, ensemble_name)
    if own_doc is None:
        return RestartChain(ensemble=None, ancestors=ancestors, unresolved_ensemble_uuid=None, truncated=False)

    visited_uuids = {own_doc.ensemble_uuid}
    restart_from = own_doc.restart_from
    while restart_from is not None:
        if restart_from in visited_uuids or len(ancestors) >= MAX_RESTART_CHAIN_DEPTH:
            truncated = True
            break

        ancestor_doc = await find_ensemble_restart_doc_by_uuid_async(sumo_client, restart_from)
        if ancestor_doc is None:
            unresolved_ensemble_uuid = restart_from
            break

        visited_uuids.add(restart_from)
        ancestors.append(_to_resolved_ensemble(ancestor_doc))
        restart_from = ancestor_doc.restart_from

    LOGGER.debug(
        f"get_restart_chain_async() took: {perf_metrics.to_string()}, {case_uuid=}, {ensemble_name=}, "
        f"{len(ancestors)=}, {unresolved_ensemble_uuid=}, {truncated=}"
    )

    return RestartChain(
        ensemble=_to_resolved_ensemble(own_doc),
        ancestors=ancestors,
        unresolved_ensemble_uuid=unresolved_ensemble_uuid,
        truncated=truncated,
    )


async def get_case_ensemble_restart_infos_async(sumo_client: SumoClient, case_uuid: str) -> list[EnsembleRestartInfo]:
    """Get the direct restart parent (if any) of every ensemble in a case, sorted by ensemble name"""
    perf_metrics = PerfMetrics()

    try:
        async with asyncio.TaskGroup() as tg:
            # Raises NoDataError if the case does not exist or the user has no access
            tg.create_task(create_sumo_case_async(sumo_client, case_uuid))
            restart_from_task = tg.create_task(get_restart_from_per_ensemble_async(sumo_client, case_uuid))
    except* ServiceLayerException as exc_group:
        for exc in exc_group.exceptions:
            raise exc from exc_group  # Reraise the first exception
    restart_from_by_name = restart_from_task.result()
    perf_metrics.record_lap("restart-from")

    unique_parent_uuids = {uuid for uuid in restart_from_by_name.values() if uuid is not None}
    async with asyncio.TaskGroup() as tg:
        resolve_tasks = {
            uuid: tg.create_task(resolve_ensemble_by_uuid_async(sumo_client, uuid)) for uuid in unique_parent_uuids
        }
    resolved_by_uuid = {uuid: task.result() for uuid, task in resolve_tasks.items()}
    perf_metrics.record_lap("resolve-parents")

    restart_infos: list[EnsembleRestartInfo] = []
    for ensemble_name in sorted(restart_from_by_name):
        parent_uuid = restart_from_by_name[ensemble_name]
        parent = resolved_by_uuid[parent_uuid] if parent_uuid is not None else None
        restart_infos.append(
            EnsembleRestartInfo(
                ensemble_name=ensemble_name,
                restart_from=parent,
                restart_from_unresolved_uuid=parent_uuid if parent_uuid is not None and parent is None else None,
            )
        )

    LOGGER.debug(
        f"get_case_ensemble_restart_infos_async() took: {perf_metrics.to_string()}, {case_uuid=}, "
        f"{len(restart_infos)=}, {len(unique_parent_uuids)=}"
    )
    return restart_infos
