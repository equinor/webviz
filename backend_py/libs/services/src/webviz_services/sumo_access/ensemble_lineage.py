import logging
from dataclasses import dataclass

import httpx
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics

LOGGER = logging.getLogger(__name__)

MAX_RESTART_CHAIN_DEPTH = 10


@dataclass(frozen=True)
class RestartAncestor:
    ensemble_uuid: str
    case_uuid: str
    case_name: str
    ensemble_name: str


@dataclass(frozen=True)
class RestartChain:
    ancestors: list[RestartAncestor]  # nearest parent first
    unresolved_ensemble_uuid: str | None  # set if the chain broke on a uuid we could not resolve
    truncated: bool  # depth cap or cycle hit


async def _get_ensemble_uuid_and_restart_from_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str
) -> tuple[str | None, str | None]:
    # .limit(1) is essential: without it getitem_async() first lists every uuid in the context.
    # restart_from is not indexed in Sumo, so it can only be read from a document's _source. The class=ensemble
    # pseudo-document does not carry it, hence a realization document is used.
    search_context = (
        SearchContext(sumo=sumo_client).filter(uuid=case_uuid, ensemble=ensemble_name, realization=True).limit(1)
    )
    if await search_context.length_async() == 0:
        return None, None

    doc = await search_context.getitem_async(0)
    ensemble_meta = doc.metadata.get("fmu", {}).get("ensemble", {})
    return ensemble_meta.get("uuid"), ensemble_meta.get("restart_from")


async def get_restart_from_uuid_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str) -> str | None:
    """Get the uuid of the ensemble that the given ensemble was restarted from, or None if it is not a restart."""
    _ensemble_uuid, restart_from = await _get_ensemble_uuid_and_restart_from_async(
        sumo_client, case_uuid, ensemble_name
    )
    return restart_from


async def resolve_ensemble_by_uuid_async(sumo_client: SumoClient, ensemble_uuid: str) -> RestartAncestor | None:
    """Resolve an ensemble uuid to case uuid/name and ensemble name.

    Returns None if the ensemble cannot be found, which in Sumo is indistinguishable from the user not having access.
    """
    try:
        ensemble = await SearchContext(sumo=sumo_client).get_ensemble_by_uuid_async(ensemble_uuid)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (403, 404):
            LOGGER.debug(f"Could not resolve ensemble uuid {ensemble_uuid}: {exc.response.status_code}")
            return None
        raise
    except AssertionError:
        LOGGER.debug(f"Sumo object with uuid {ensemble_uuid} is not an ensemble")
        return None

    return RestartAncestor(
        ensemble_uuid=ensemble_uuid,
        case_uuid=ensemble.caseuuid,
        case_name=ensemble.casename,
        ensemble_name=ensemble.name,
    )


async def get_restart_chain_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str) -> RestartChain:
    """Follow restart_from recursively, returning the ancestors nearest parent first.

    Stops when an ensemble is not a restart, when a uuid cannot be resolved, on a cycle, or when
    MAX_RESTART_CHAIN_DEPTH ancestors have been collected and the last one is itself a restart.
    """
    perf_metrics = PerfMetrics()

    own_uuid, restart_from = await _get_ensemble_uuid_and_restart_from_async(sumo_client, case_uuid, ensemble_name)
    visited_uuids: set[str] = {own_uuid} if own_uuid else set()
    ancestors: list[RestartAncestor] = []
    unresolved_ensemble_uuid: str | None = None
    truncated = False

    while restart_from is not None:
        if restart_from in visited_uuids or len(ancestors) >= MAX_RESTART_CHAIN_DEPTH:
            truncated = True
            break

        ancestor = await resolve_ensemble_by_uuid_async(sumo_client, restart_from)
        if ancestor is None:
            unresolved_ensemble_uuid = restart_from
            break

        visited_uuids.add(restart_from)
        ancestors.append(ancestor)
        restart_from = await get_restart_from_uuid_async(sumo_client, ancestor.case_uuid, ancestor.ensemble_name)

    LOGGER.debug(
        f"get_restart_chain_async() took: {perf_metrics.to_string()}, {case_uuid=}, {ensemble_name=}, "
        f"{len(ancestors)=}, {unresolved_ensemble_uuid=}, {truncated=}"
    )

    return RestartChain(ancestors=ancestors, unresolved_ensemble_uuid=unresolved_ensemble_uuid, truncated=truncated)
