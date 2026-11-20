from dataclasses import dataclass
from typing import Any

from sumo.wrapper import SumoClient

# fmu.ensemble.restart_from is not indexed in Sumo, so it can only be read from a document's _source. The
# class=ensemble pseudo-document does not carry it, hence a realization-level document is used. Interim until
# Sumo exposes restart_from on the ensemble object.
_RESTART_SOURCE_FIELDS = [
    "fmu.case.uuid",
    "fmu.case.name",
    "fmu.ensemble.uuid",
    "fmu.ensemble.name",
    "fmu.ensemble.restart_from",
]

# Upper bound on the number of ensembles in a case when aggregating per ensemble
_MAX_ENSEMBLES_PER_CASE = 1000


@dataclass(frozen=True)
class EnsembleRestartDoc:
    case_uuid: str
    case_name: str
    ensemble_uuid: str
    ensemble_name: str
    restart_from: str | None


def _realization_docs_query(term_filters: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "bool": {
            "filter": [*term_filters, {"exists": {"field": "fmu.realization.id"}}],
            "must_not": [{"term": {"_sumo.hidden": True}}],
        }
    }


async def _find_first_restart_doc_async(
    sumo_client: SumoClient, term_filters: list[dict[str, Any]]
) -> EnsembleRestartDoc | None:
    payload = {"size": 1, "_source": _RESTART_SOURCE_FIELDS, "query": _realization_docs_query(term_filters)}
    response = await sumo_client.post_async("/search", json=payload)
    hits = response.json()["hits"]["hits"]
    if not hits:
        return None

    fmu = hits[0]["_source"]["fmu"]
    return EnsembleRestartDoc(
        case_uuid=fmu["case"]["uuid"],
        case_name=fmu["case"]["name"],
        ensemble_uuid=fmu["ensemble"]["uuid"],
        ensemble_name=fmu["ensemble"]["name"],
        restart_from=fmu["ensemble"].get("restart_from"),
    )


async def find_ensemble_restart_doc_by_name_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str
) -> EnsembleRestartDoc | None:
    """Identity and restart_from of an ensemble given its case and name, or None if it has no realization documents"""
    return await _find_first_restart_doc_async(
        sumo_client,
        [
            {"term": {"fmu.case.uuid.keyword": case_uuid}},
            {"term": {"fmu.ensemble.name.keyword": ensemble_name}},
        ],
    )


async def find_ensemble_restart_doc_by_uuid_async(
    sumo_client: SumoClient, ensemble_uuid: str
) -> EnsembleRestartDoc | None:
    """Identity and restart_from of an ensemble given its uuid.

    Returns None if the ensemble cannot be found, which in Sumo is indistinguishable from the user not having access.
    """
    return await _find_first_restart_doc_async(sumo_client, [{"term": {"fmu.ensemble.uuid.keyword": ensemble_uuid}}])


async def get_restart_from_per_ensemble_async(sumo_client: SumoClient, case_uuid: str) -> dict[str, str | None]:
    """Get restart_from (or None) for every ensemble in a case, keyed by ensemble name"""
    payload = {
        "size": 0,
        "query": _realization_docs_query([{"term": {"fmu.case.uuid.keyword": case_uuid}}]),
        "aggs": {
            "ensembles": {
                "terms": {"field": "fmu.ensemble.name.keyword", "size": _MAX_ENSEMBLES_PER_CASE},
                "aggs": {
                    "doc": {"top_hits": {"size": 1, "_source": ["fmu.ensemble.restart_from"]}},
                },
            }
        },
    }
    response = await sumo_client.post_async("/search", json=payload)
    buckets = response.json()["aggregations"]["ensembles"]["buckets"]

    restart_from_by_name: dict[str, str | None] = {}
    for bucket in buckets:
        source = bucket["doc"]["hits"]["hits"][0]["_source"]
        restart_from_by_name[bucket["key"]] = source.get("fmu", {}).get("ensemble", {}).get("restart_from")
    return restart_from_by_name
