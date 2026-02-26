from typing import List
import logging

from pydantic import BaseModel

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_core_utils.perf_metrics import PerfMetrics

from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class SumoAsset(BaseModel):
    asset_name: str


class EnsembleInfo(BaseModel):
    name: str
    realization_count: int
    standard_results: list[str]


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str
    updated_at_utc_ms: int
    description: str
    model_name: str
    model_revision: str
    ensembles: list[EnsembleInfo]


class SumoInspector:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client(access_token)

    async def get_asset_names_async(self) -> List[SumoAsset]:
        """Get list of assets"""
        timer = PerfMetrics()
        search_context = SearchContext(self._sumo_client)
        asset_names = await search_context.asset_names_async
        timer.record_lap("get_assets")
        asset_names = sorted(list(set(asset_names)))
        LOGGER.debug(timer.to_string())
        return [SumoAsset(asset_name=asset_name) for asset_name in asset_names]

    async def get_cases_async(self, asset_name: str) -> list[CaseInfo]:
        """
        Get all cases with available result types from SUMO using aggregations and filters.

        - The case timestamp is max timestamp for all documents for given case (including metadata document)
        - Excluding all aggregated documents
        """

        payload = {
            "size": 0,
            "query": {
                "bool": {
                    "must": [
                        {"match": {"access.asset.name.keyword": asset_name}},
                    ],
                    "must_not": [{"exists": {"field": "fmu.aggregation"}}],
                },
            },
            "aggs": {
                "uuids": {
                    "terms": {
                        "field": "fmu.case.uuid.keyword",
                        "size": 65535,
                    },
                    "aggs": {
                        "description": {
                            "terms": {
                                "field": "fmu.case.description.keyword",
                                "size": 65535,
                            }
                        },
                        "timestamp_max": {
                            "max": {
                                "field": "_sumo.timestamp",
                            }
                        },
                        "status": {
                            "terms": {
                                "field": "_sumo.status.keyword",
                                "size": 10,
                            }
                        },
                        "user": {
                            "terms": {
                                "field": "fmu.case.user.id.keyword",
                                "size": 10,
                            }
                        },
                        "name": {
                            "terms": {
                                "field": "fmu.case.name.keyword",
                                "size": 100,
                            }
                        },
                        "model_name": {
                            "terms": {
                                "field": "fmu.model.name.keyword",
                                "size": 10,
                            }
                        },
                        "model_revision": {
                            "terms": {
                                "field": "fmu.model.revision.keyword",
                                "size": 10,
                            }
                        },
                        "ensemble_names": {
                            "terms": {
                                "field": "fmu.ensemble.name.keyword",
                                "size": 65535,
                            },
                            "aggs": {
                                "realizations_count": {"cardinality": {"field": "fmu.realization.id"}},
                                "standard_result": {
                                    "terms": {
                                        "field": "data.standard_result.name.keyword",
                                        "size": 10,
                                    }
                                },
                            },
                        },
                    },
                }
            },
        }

        response = await self._sumo_client.post_async("/search", json=payload)
        response_dict = response.json()

        aggs = response_dict.get("aggregations", {})
        case_buckets = aggs.get("uuids", {}).get("buckets", [])

        case_info_arr: list[CaseInfo] = []

        for case_bucket in case_buckets:
            case_info = _create_case_info_from_case_bucket(case_bucket)
            case_info_arr.append(case_info)

        return case_info_arr


def _create_case_info_from_case_bucket(case_bucket: dict) -> CaseInfo:
    """
    Create CaseInfo object from a case bucket dictionary obtained from SUMO search aggregation response.
    """
    case_uuid = case_bucket["key"]
    description = _get_all_buckets_key_as_list(case_bucket, "description")
    case_timestamp_max = _get_number_value_for_key(case_bucket, "timestamp_max")
    status = _get_all_buckets_key_as_list(case_bucket, "status")
    user = _get_single_bucket_key_as_str(case_bucket, "user")
    case_name = _get_single_bucket_key_as_str(case_bucket, "name")

    # Populate model name and revision.
    # The assumption here is that a case should only have one model name and revision.
    # If there are multiple or none, we will default to empty string.
    try:
        model_name_str = _get_single_bucket_key_as_str(case_bucket, "model_name")
    except ValueError:
        model_name_str = "No model name"
    try:
        model_revision_str = _get_single_bucket_key_as_str(case_bucket, "model_revision")
    except ValueError:
        model_revision_str = "No revision"

    ensemble_buckets = case_bucket.get("ensemble_names", {}).get("buckets", [])

    ensemble_info_arr: list[EnsembleInfo] = []
    for ensemble_bucket in ensemble_buckets:
        ensemble_info = _create_ensemble_info_from_ensemble_bucket(ensemble_bucket)
        if ensemble_info:
            ensemble_info_arr.append(ensemble_info)

    return CaseInfo(
        uuid=case_uuid,
        name=case_name,
        status=status[0] if status else "unknown",  # Default to "unknown" if no status is found
        user=user,
        updated_at_utc_ms=case_timestamp_max,
        description=description[0] if description else "",
        model_name=model_name_str,
        model_revision=model_revision_str,
        ensembles=ensemble_info_arr,
    )


def _create_ensemble_info_from_ensemble_bucket(ensemble_bucket: dict) -> EnsembleInfo | None:
    """
    Create EnsembleInfo object from an ensemble bucket dictionary obtained from SUMO search aggregation response.
    Returns None if the ensemble does not have a valid realization count.
    """

    ensemble_name = ensemble_bucket["key"]
    realizations_count = _get_number_value_for_key(ensemble_bucket, "realizations_count")

    if realizations_count is None:
        return None

    standard_result = _get_all_buckets_key_as_list(ensemble_bucket, "standard_result")
    return EnsembleInfo(
        name=ensemble_name,
        realization_count=realizations_count,
        standard_results=standard_result,
    )


def _get_all_buckets_key_as_list(obj: dict, key: str) -> list[str]:
    """
    Get all bucket keys as a list of strings from a dictionary.
    If the key does not exist or the value is not a list, return an empty list.
    """
    buckets = obj.get(key, {}).get("buckets", [])
    return [bucket.get("key", "") for bucket in buckets if isinstance(bucket, dict)]


def _get_single_bucket_key_as_str(obj: dict, key: str) -> str:
    """
    Get a single bucket key as a string from a dictionary.
    If the key does not exist or the value is not a string, return an empty string.
    """
    buckets = obj.get(key, {}).get("buckets", [])
    if buckets and len(buckets) == 1 and isinstance(buckets[0], dict):
        return buckets[0].get("key", "")
    raise ValueError(f"Expected a single bucket for key '{key}', but found: {buckets}")


def _get_number_value_for_key(obj: dict, key: str) -> int:
    """
    Get value for key in a dictionary as an integer.

    If value does not exist or is not an integer, return -1
    """
    value = obj.get(key, {}).get("value", None)
    if isinstance(value, int):
        return value
    return -1
