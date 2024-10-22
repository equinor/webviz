from typing import Any, Dict, Tuple, Optional

from sumo.wrapper import SumoClient
from fmu.sumo.explorer import TimeFilter, TimeType

from primary.services.service_exceptions import InvalidDataError, Service


def get_time_filter(time_or_interval_str: Optional[str]) -> TimeFilter:
    if time_or_interval_str is None:
        time_filter = TimeFilter(TimeType.NONE)

    else:
        timestamp_arr = time_or_interval_str.split("/", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")
        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )
    return time_filter


async def get_grid_geometry_blob_id_async(
    sumo_client: SumoClient,
    case_id: str,
    iteration: str,
    realization: int,
    grid_name: str,
) -> str:
    """Get the blob id for a given grid geometry in a case, iteration and realization"""
    payload = {
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.name": iteration}},
                    {"match": {"fmu.realization.id": realization}},
                    {"match": {"data.name.keyword": grid_name}},
                ]
            }
        },
        "size": 1,
    }
    response = await sumo_client.post_async("/search", json=payload)

    result = response.json()
    hits = result["hits"]["hits"]
    if len(hits) != 1:
        raise ValueError(f"Expected 1 hit, got {len(hits)}")
    return [hit["_id"] for hit in hits][0]


async def get_grid_geometry_and_property_blob_ids_async(
    sumo_client: SumoClient,
    case_id: str,
    iteration: str,
    realization: int,
    grid_name: str,
    parameter_name: str,
    parameter_time_or_interval_str: Optional[str] = None,
) -> Tuple[str, str]:
    """Get the blob ids for both grid geometry and grid property in a case, iteration, and realization"""

    # Temporary workarounds for discrepancies in the metadata
    grid_name_for_parameters = grid_name
    if grid_name == "Geogrid":
        grid_name_for_parameters = ""
    if "TROLL" in grid_name:
        grid_name_for_parameters = parameter_name
        parameter_name = grid_name

    query: Dict[str, Any] = {
        "bool": {
            "should": [
                {
                    "bool": {
                        "must": [
                            {"term": {"_sumo.parent_object.keyword": case_id}},
                            {"term": {"class.keyword": "cpgrid"}},
                            {"term": {"fmu.iteration.name.keyword": iteration}},
                            {"term": {"fmu.realization.id": realization}},
                            {"term": {"data.name.keyword": grid_name}},
                        ]
                    }
                },
                {
                    "bool": {
                        "must": [
                            {"term": {"_sumo.parent_object.keyword": case_id}},
                            {"term": {"class.keyword": "cpgrid_property"}},
                            {"term": {"fmu.iteration.name.keyword": iteration}},
                            {"term": {"fmu.realization.id": realization}},
                            {"term": {"data.name.keyword": parameter_name}},
                            {"term": {"data.tagname.keyword": grid_name_for_parameters}},
                        ]
                    }
                },
            ],
            "minimum_should_match": 1,
        }
    }
    time_filter = get_time_filter(parameter_time_or_interval_str)

    if time_filter.time_type != TimeType.NONE:
        query["bool"]["should"][1]["bool"]["must"].append({"term": {"data.time.t0.value": time_filter.start}})
    if time_filter.time_type == TimeType.INTERVAL:
        query["bool"]["should"][1]["bool"]["must"].append({"term": {"data.time.t1.value": time_filter.end}})

    payload = {
        "query": query,
        "size": 2,
    }
    response = await sumo_client.post_async("/search", json=payload)

    result = response.json()
    hits = result["hits"]["hits"]
    if len(hits) != 2:
        raise InvalidDataError(f"Expected 2 hits, got {len(hits)}", service=Service.SUMO)

    grid_geometry_id = None
    grid_property_id = None
    for hit in hits:
        if hit["_source"]["class"] == "cpgrid":
            grid_geometry_id = hit["_id"]
        elif hit["_source"]["class"] == "cpgrid_property":
            grid_property_id = hit["_id"]

    if not grid_geometry_id or not grid_property_id:
        raise InvalidDataError("Did not find expected document types", service=Service.SUMO)

    return grid_geometry_id, grid_property_id
