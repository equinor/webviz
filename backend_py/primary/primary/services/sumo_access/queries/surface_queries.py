from enum import Enum
import datetime
import logging
from dataclasses import dataclass

from sumo.wrapper import SumoClient

LOGGER = logging.getLogger(__name__)


class SurfTimeType(str, Enum):
    NO_TIME = "NO_TIME"
    TIME_POINT = "TIME_POINT"
    INTERVAL = "INTERVAL"


@dataclass(frozen=True, kw_only=True)
class SurfInfo:
    name: str
    tagname: str
    content: str
    standard_result: str | None = None
    is_stratigraphic: bool
    global_min_val: float
    global_max_val: float


@dataclass(frozen=True)
class TimeInterval:
    t0_ms: int
    t1_ms: int
    t0_isostr: str
    t1_isostr: str


@dataclass(frozen=True)
class TimePoint:
    t0_ms: int
    t0_isostr: str


class RealizationSurfQueries:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    async def find_surf_info_async(self, time_type: SurfTimeType) -> list[SurfInfo]:
        query_dict = _build_realization_surfs_query_dict(self._case_uuid, self._iteration_name, time_type)
        ret_arr = await _run_query_and_aggregate_surf_info_async(self._sumo_client, query_dict=query_dict)
        return ret_arr

    async def find_surf_time_points_async(self) -> list[TimePoint]:
        query_dict = _build_realization_surfs_query_dict(self._case_uuid, self._iteration_name, SurfTimeType.TIME_POINT)
        ret_arr = await _run_query_and_aggregate_time_points_async(self._sumo_client, query_dict=query_dict)
        return ret_arr

    async def find_surf_time_intervals_async(self) -> list[TimeInterval]:
        query_dict = _build_realization_surfs_query_dict(self._case_uuid, self._iteration_name, SurfTimeType.INTERVAL)
        ret_arr = await _run_query_and_aggregate_time_intervals_async(self._sumo_client, query_dict=query_dict)
        return ret_arr


class ObservedSurfQueries:
    def __init__(self, sumo_client: SumoClient, case_uuid: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid

    async def find_surf_info_async(self, time_type: SurfTimeType) -> list[SurfInfo]:
        query_dict = _build_observed_surfs_query_dict(self._case_uuid, time_type)
        ret_arr = await _run_query_and_aggregate_surf_info_async(self._sumo_client, query_dict=query_dict)
        return ret_arr

    async def find_surf_time_points_async(self) -> list[TimePoint]:
        query_dict = _build_observed_surfs_query_dict(self._case_uuid, SurfTimeType.TIME_POINT)
        ret_arr = await _run_query_and_aggregate_time_points_async(self._sumo_client, query_dict=query_dict)
        return ret_arr

    async def find_surf_time_intervals_async(self) -> list[TimeInterval]:
        query_dict = _build_observed_surfs_query_dict(self._case_uuid, SurfTimeType.INTERVAL)
        ret_arr = await _run_query_and_aggregate_time_intervals_async(self._sumo_client, query_dict=query_dict)
        return ret_arr


# --------------------------------------------------------------------------------------
def _build_realization_surfs_query_dict(case_uuid: str, iteration_name: str, time_type: SurfTimeType) -> dict:
    must_arr: list[dict] = []
    should_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"term": {"class.keyword": "surface"}})
    must_arr.append({"term": {"_sumo.parent_object.keyword": case_uuid}})
    must_arr.append({"term": {"fmu.iteration.name.keyword": iteration_name}})
    must_arr.append({"term": {"data.is_observation": False}})
    must_arr.append({"term": {"data.format": "irap_binary"}})
    must_arr.append({"exists": {"field": "fmu.realization.id"}})

    # There are some (old) documents that don't have the fmu.context.stage field so allow this,
    # but if it does exist, make sure the context is realization
    should_arr.append({"term": {"fmu.context.stage.keyword": "realization"}})
    should_arr.append({"bool": {"must_not": [{"exists": {"field": "fmu.context.stage"}}]}})

    if time_type == SurfTimeType.NO_TIME:
        must_not_arr.append({"exists": {"field": "data.time.t0"}})
        must_not_arr.append({"exists": {"field": "data.time.t1"}})
    elif time_type == SurfTimeType.TIME_POINT:
        must_arr.append({"exists": {"field": "data.time.t0"}})
        must_not_arr.append({"exists": {"field": "data.time.t1"}})
    elif time_type == SurfTimeType.INTERVAL:
        must_arr.append({"exists": {"field": "data.time.t0"}})
        must_arr.append({"exists": {"field": "data.time.t1"}})

    query_dict = {
        "bool": {
            "must": must_arr,
            "must_not": must_not_arr,
            "should": should_arr,
            "minimum_should_match": 1,
        }
    }

    return query_dict


# --------------------------------------------------------------------------------------
def _build_observed_surfs_query_dict(case_uuid: str, time_type: SurfTimeType) -> dict:
    must_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"term": {"class.keyword": "surface"}})
    must_arr.append({"term": {"_sumo.parent_object.keyword": case_uuid}})
    must_arr.append({"term": {"fmu.context.stage.keyword": "case"}})
    must_arr.append({"term": {"data.is_observation": True}})
    must_arr.append({"term": {"data.format": "irap_binary"}})
    must_not_arr.append({"exists": {"field": "fmu.iteration.name.keyword"}})
    must_not_arr.append({"exists": {"field": "fmu.realization.id"}})

    if time_type == SurfTimeType.TIME_POINT:
        must_arr.append({"exists": {"field": "data.time.t0"}})
        must_not_arr.append({"exists": {"field": "data.time.t1"}})
    elif time_type == SurfTimeType.INTERVAL:
        must_arr.append({"exists": {"field": "data.time.t0"}})
        must_arr.append({"exists": {"field": "data.time.t1"}})

    query_dict = {
        "bool": {
            "must": must_arr,
            "must_not": must_not_arr,
        }
    }

    return query_dict


# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_surf_info_async(sumo_client: SumoClient, query_dict: dict) -> list[SurfInfo]:
    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "key_combinations": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        {"k_name": {"terms": {"field": "data.name.keyword"}}},
                        {"k_content": {"terms": {"field": "data.content.keyword"}}},
                        {
                            "k_tagname": {
                                "terms": {
                                    "field": "data.tagname.keyword",
                                    "missing_bucket": True,
                                }
                            }
                        },  # Allow missing tagname
                        {
                            "k_standard_result": {
                                "terms": {
                                    "field": "data.standard_result.name.keyword",
                                    "missing_bucket": True,  # Allow missing standard_result
                                }
                            }
                        },
                    ],
                },
                "aggs": {
                    "agg_z_val_min": {"min": {"field": "data.bbox.zmin"}},
                    "agg_z_val_max": {"max": {"field": "data.bbox.zmax"}},
                    "agg_is_stratigraphic_min": {"min": {"field": "data.stratigraphic"}},
                },
            },
        },
        "_source": True,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    ret_arr: list[SurfInfo] = []
    for bucket in response_dict["aggregations"]["key_combinations"]["buckets"]:
        is_stratigraphic: bool = bucket["agg_is_stratigraphic_min"]["value"] == 1
        ret_arr.append(
            SurfInfo(
                name=bucket["key"]["k_name"],
                tagname=bucket["key"]["k_tagname"],
                standard_result=bucket["key"].get("k_standard_result"),
                content=bucket["key"]["k_content"],
                is_stratigraphic=is_stratigraphic,
                global_min_val=bucket["agg_z_val_min"]["value"],
                global_max_val=bucket["agg_z_val_max"]["value"],
            )
        )
    return ret_arr


# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_time_intervals_async(
    sumo_client: SumoClient, query_dict: dict
) -> list[TimeInterval]:
    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "unique_time_intervals": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        {"k_t0": {"terms": {"field": "data.time.t0.value"}}},
                        {"k_t1": {"terms": {"field": "data.time.t1.value"}}},
                    ],
                },
            },
        },
        "_source": True,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    ret_arr: list[TimeInterval] = []
    for bucket in response_dict["aggregations"]["unique_time_intervals"]["buckets"]:
        t0_ms = bucket["key"]["k_t0"]
        t1_ms = bucket["key"]["k_t1"]
        t0_isostr = _timestamp_utc_ms_to_iso_str(t0_ms)
        t1_isostr = _timestamp_utc_ms_to_iso_str(t1_ms)
        ret_arr.append(TimeInterval(t0_ms=t0_ms, t1_ms=t1_ms, t0_isostr=t0_isostr, t1_isostr=t1_isostr))

    return ret_arr


# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_time_points_async(sumo_client: SumoClient, query_dict: dict) -> list[TimePoint]:
    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "unique_time_points": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        {"k_t0": {"terms": {"field": "data.time.t0.value"}}},
                    ],
                },
            },
        },
        "_source": True,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    ret_arr: list[TimePoint] = []
    for bucket in response_dict["aggregations"]["unique_time_points"]["buckets"]:
        t0_ms = bucket["key"]["k_t0"]
        t0_isostr = _timestamp_utc_ms_to_iso_str(t0_ms)
        ret_arr.append(TimePoint(t0_ms=t0_ms, t0_isostr=t0_isostr))

    return ret_arr


# --------------------------------------------------------------------------------------
def _timestamp_utc_ms_to_iso_str(timestamp_utc_ms: int) -> str:
    isostr = datetime.datetime.fromtimestamp(timestamp_utc_ms / 1000, datetime.timezone.utc).isoformat()
    isostr = isostr.replace("+00:00", "")
    return isostr


# --------------------------------------------------------------------------------------
def _delete_key_from_dict_recursive(the_dict: dict, key_to_delete: str) -> None:
    if isinstance(the_dict, dict):
        for key, value in list(the_dict.items()):
            if key == key_to_delete:
                del the_dict[key]
            else:
                _delete_key_from_dict_recursive(value, key_to_delete)
    elif isinstance(the_dict, list):
        for item in the_dict:
            _delete_key_from_dict_recursive(item, key_to_delete)
