import asyncio
from enum import Enum
import time
import datetime
import json
import logging
from dataclasses import dataclass

from sumo.wrapper import SumoClient

LOGGER = logging.getLogger(__name__)


class SurfTimeType(Enum):
    NO_TIME = 1
    TIME_POINT = 2
    INTERVAL = 3


@dataclass(frozen=True)
class SurfInfo:
    name: str
    tagname: str
    content: str
    time_type: SurfTimeType
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



# --------------------------------------------------------------------------------------
def _build_realization_surfs_query_dict(case_uuid: str, ensemble_name: str, time_type: SurfTimeType) -> dict:
    must_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"match": {"class.keyword": "surface"}})
    must_arr.append({"match": {"_sumo.parent_object.keyword": case_uuid}})
    must_arr.append({"match": {"fmu.iteration.name.keyword": ensemble_name}})
    must_arr.append({"match": {"fmu.context.stage.keyword": "realization"}})
    must_arr.append({"match": {"data.is_observation": False}})
    must_arr.append({"exists": {"field": "fmu.realization.id"}})

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
            "must_not": must_not_arr
        }
    }

    return query_dict



# --------------------------------------------------------------------------------------
def _build_observed_surfs_query_dict(case_uuid: str, time_type: SurfTimeType) -> dict:
    must_arr: list[dict] = []
    must_not_arr: list[dict] = []

    must_arr.append({"match": {"class.keyword": "surface"}})
    must_arr.append({"match": {"_sumo.parent_object.keyword": case_uuid}})
    must_arr.append({"match": {"fmu.context.stage.keyword": "case"}})
    must_arr.append({"match": {"data.is_observation": True}})

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
            "must_not": must_not_arr
        }
    }

    return query_dict


# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_surf_info(sumo_client: SumoClient, query_dict: dict, queried_time_type: SurfTimeType) -> list[SurfInfo]:
    search_payload = {
        "track_total_hits": True,

        "query": query_dict,

        # "fields": [
        #     "data.name.keyword",
        #     "data.tagname.keyword",
        #     "data.content.keyword",
        #     "data.is_observation",
        #     "data.stratigraphic",
        # ],

        "aggs": {
            "key_combinations": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        { "k_name": { "terms": { "field": "data.name.keyword" } } },
                        { "k_tagname": { "terms": { "field": "data.tagname.keyword" } } },
                        { "k_content": { "terms": { "field": "data.content.keyword" } } },
                        { "k_is_stratigraphic": { "terms": { "field": "data.stratigraphic" } } },
                    ],
                },
                "aggs": {
                    # "my_top_hits": {
                    #     "top_hits": {
                    #         "_source": False,
                    #         "size": 1,
                    #     }
                    # },
                    "agg_min_z_val": { "min": { "field": "data.bbox.zmin" } },
                    "agg_max_z_val": { "max": { "field": "data.bbox.zmax" } },
                },
            },
        },

        "_source": True,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    # LOGGER.debug("-----------------")
    # delete_key_from_dict_recursive(response_dict, "parameters")
    # delete_key_from_dict_recursive(response_dict, "realization_ids")
    # LOGGER.debug(json.dumps(response_dict, indent=2))
    # LOGGER.debug("-----------------")

    LOGGER.debug(f"{response_dict['took']=}")
    LOGGER.debug(f"{len(response_dict['aggregations']['key_combinations']['buckets'])=}")

    ret_arr: list[SurfInfo] = []
    for bucket in response_dict["aggregations"]["key_combinations"]["buckets"]:
        ret_arr.append(SurfInfo(
            time_type=queried_time_type,
            name=bucket["key"]["k_name"], 
            tagname=bucket["key"]["k_tagname"], 
            content=bucket["key"]["k_content"],
            is_stratigraphic=bucket["key"]["k_is_stratigraphic"], 
            global_min_val=bucket["agg_min_z_val"]["value"], 
            global_max_val=bucket["agg_max_z_val"]["value"]))
        
    return ret_arr


# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_time_intervals(sumo_client: SumoClient, query_dict: dict) -> list[TimeInterval]:
    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "unique_time_intervals": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        { "k_t0": { "terms": { "field": "data.time.t0.value" } } },
                        { "k_t1": { "terms": { "field": "data.time.t1.value" } } },
                    ],
                },
            },
        },
        "_source": False,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    # LOGGER.debug("-----------------")
    # delete_key_from_dict_recursive(response_dict, "parameters")
    # delete_key_from_dict_recursive(response_dict, "realization_ids")
    # LOGGER.debug(json.dumps(response_dict, indent=2))
    # LOGGER.debug("-----------------")

    LOGGER.debug(f"{response_dict['took']=}")
    LOGGER.debug(f"{len(response_dict['aggregations']['unique_time_intervals']['buckets'])=}")

    ret_arr: TimeInterval = []
    for bucket in response_dict['aggregations']['unique_time_intervals']['buckets']:
        t0_ms = bucket['key']['k_t0']
        t1_ms = bucket['key']['k_t1']
        t0_isostr = timestamp_utc_ms_to_iso_str(t0_ms)
        t1_isostr = timestamp_utc_ms_to_iso_str(t1_ms)
        ret_arr.append(TimeInterval(t0_ms=t0_ms, t1_ms=t1_ms, t0_isostr=t0_isostr, t1_isostr=t1_isostr))

    return ret_arr



# --------------------------------------------------------------------------------------
async def _run_query_and_aggregate_time_points(sumo_client: SumoClient, query_dict: dict) -> list[TimePoint]:
    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "unique_time_points": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        { "k_t0": { "terms": { "field": "data.time.t0.value" } } },
                    ],
                },
            },
        },
        "_source": False,
        "size": 0,
    }

    response = await sumo_client.post_async("/search", json=search_payload)
    response_dict = response.json()

    # LOGGER.debug("-----------------")
    # delete_key_from_dict_recursive(response_dict, "parameters")
    # delete_key_from_dict_recursive(response_dict, "realization_ids")
    # LOGGER.debug(json.dumps(response_dict, indent=2))
    # LOGGER.debug("-----------------")

    LOGGER.debug(f"{response_dict['took']=}")
    LOGGER.debug(f"{len(response_dict['aggregations']['unique_time_points']['buckets'])=}")

    ret_arr: TimeInterval = []
    for bucket in response_dict['aggregations']['unique_time_points']['buckets']:
        t0_ms = bucket['key']['k_t0']
        t0_isostr = timestamp_utc_ms_to_iso_str(t0_ms)
        ret_arr.append(TimePoint(t0_ms=t0_ms, t0_isostr=t0_isostr))

    return ret_arr



# --------------------------------------------------------------------------------------
async def find_realization_surf_info(sumo_client, case_uuid, ensemble_name, time_type: SurfTimeType) -> list[SurfInfo]:
    query_dict = _build_realization_surfs_query_dict(case_uuid=case_uuid, ensemble_name=ensemble_name, time_type=time_type)
    ret_arr = await _run_query_and_aggregate_surf_info(sumo_client, query_dict=query_dict, queried_time_type=time_type)
    return ret_arr


# --------------------------------------------------------------------------------------
async def find_observed_surf_info(sumo_client, case_uuid, time_type: SurfTimeType) -> list[SurfInfo]:
    query_dict = _build_observed_surfs_query_dict(case_uuid=case_uuid, time_type=time_type)
    ret_arr = await _run_query_and_aggregate_surf_info(sumo_client, query_dict=query_dict, queried_time_type=time_type)
    return ret_arr


# --------------------------------------------------------------------------------------
async def find_realization_surf_time_points(sumo_client, case_uuid, ensemble_name) -> list[TimePoint]:
    query_dict = _build_realization_surfs_query_dict(case_uuid, ensemble_name, SurfTimeType.TIME_POINT)
    ret_arr = await _run_query_and_aggregate_time_points(sumo_client, query_dict=query_dict)
    return ret_arr


# --------------------------------------------------------------------------------------
async def find_realization_surf_time_intervals(sumo_client, case_uuid, ensemble_name) -> list[TimeInterval]:
    query_dict = _build_realization_surfs_query_dict(case_uuid, ensemble_name, SurfTimeType.INTERVAL)
    ret_arr = await _run_query_and_aggregate_time_intervals(sumo_client, query_dict=query_dict)
    return ret_arr


# --------------------------------------------------------------------------------------
async def find_observed_surf_time_points(sumo_client, case_uuid) -> list[TimePoint]:
    query_dict = _build_observed_surfs_query_dict(case_uuid, SurfTimeType.TIME_POINT)
    ret_arr = await _run_query_and_aggregate_time_points(sumo_client, query_dict=query_dict)
    return ret_arr


# --------------------------------------------------------------------------------------
async def find_observed_surf_time_intervals(sumo_client, case_uuid) -> list[TimeInterval]:
    query_dict = _build_observed_surfs_query_dict(case_uuid, SurfTimeType.INTERVAL)
    ret_arr = await _run_query_and_aggregate_time_intervals(sumo_client, query_dict=query_dict)
    return ret_arr


def delete_key_from_dict_recursive(d, key_to_delete):
    if isinstance(d, dict):
        for key, value in list(d.items()):
            if key == key_to_delete:
                del d[key]
            else:
                delete_key_from_dict_recursive(value, key_to_delete)
    elif isinstance(d, list):
        for item in d:
            delete_key_from_dict_recursive(item, key_to_delete)


def print_surf_info_arr(surf_info_arr: list[SurfInfo]) -> None:
    for surf_info in surf_info_arr:
        LOGGER.debug(f"{surf_info}")


def print_time_interval_arr(time_interval_arr: list[TimeInterval]) -> None:
    for entry in time_interval_arr:
        LOGGER.debug(f"{entry}")


def print_time_point_arr(time_point_arr: list[TimePoint]) -> None:
    for entry in time_point_arr:
        LOGGER.debug(f"{entry}")


def timestamp_utc_ms_to_iso_str(timestamp_utc_ms: int) -> str:
    #isostr = datetime.datetime.fromtimestamp(timestamp_utc_ms/1000, datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    isostr = datetime.datetime.fromtimestamp(timestamp_utc_ms/1000, datetime.timezone.utc).isoformat().replace("+00:00", "")
    return isostr




# https://www.elastic.co/guide/en/elasticsearch/reference/current/search-fields.html#search-fields-request
# https://www.elastic.co/guide/en/elasticsearch/reference/current/search-fields.html#script-fields
# https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-multi-terms-aggregation.html


# ----------------------------------------

async def my_test():

    sumo_client = SumoClient(env="prod", interactive=True)

    case_uuid = "9c7ac93c-1bc2-4fdc-a827-787a68f19a21" # SNORRE, 240422_sim2seis
    ensemble_name= "iter-0"

    # case_uuid = "88f940d4-e57b-44ce-8e62-b3e30cf2c1ec" # DROGON, 01_drogon_ahm_sumo_eclmaps
    # ensemble_name= "iter-0"

    LOGGER.debug("\n##### Starting")
    start_s = time.perf_counter()

    async with asyncio.TaskGroup() as tg:

        stat_real_task = tg.create_task(find_realization_surf_info(sumo_client, case_uuid, ensemble_name, SurfTimeType.NO_TIME))
        time_point_real_task = tg.create_task(find_realization_surf_info(sumo_client, case_uuid, ensemble_name, SurfTimeType.TIME_POINT))
        interval_real_task = tg.create_task(find_realization_surf_info(sumo_client, case_uuid, ensemble_name, SurfTimeType.INTERVAL))

        time_point_obs_task = tg.create_task(find_observed_surf_info(sumo_client, case_uuid, SurfTimeType.TIME_POINT))
        interval_obs_task = tg.create_task(find_observed_surf_info(sumo_client, case_uuid, SurfTimeType.INTERVAL))

        real_time_intervals_task = tg.create_task(find_realization_surf_time_intervals(sumo_client, case_uuid, ensemble_name))
        real_time_points_task = tg.create_task(find_realization_surf_time_points(sumo_client, case_uuid, ensemble_name))
        obs_time_intervals_task = tg.create_task(find_observed_surf_time_intervals(sumo_client, case_uuid))
        obs_time_points_task = tg.create_task(find_observed_surf_time_points(sumo_client, case_uuid))

    # print_surf_info_arr(stat_real_task.result())
    # print_surf_info_arr(time_point_real_task.result())
    # print_surf_info_arr(interval_real_task.result())

    # print_surf_info_arr(time_point_obs_task.result())
    # print_surf_info_arr(interval_obs_task.result())

    # print_time_point_arr(real_time_points_task.result())
    # print_time_interval_arr(real_time_intervals_task.result())
    # print_time_point_arr(obs_time_points_task.result())
    # print_time_interval_arr(obs_time_intervals_task.result())

    elapsed_s = time.perf_counter() - start_s
    LOGGER.debug(f"##### DONE in {elapsed_s:.2f}s")


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)-3s: %(message)s")

    asyncio.run(my_test())
