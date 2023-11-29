from typing import List

from sumo.wrapper import SumoClient


async def get_grid_names(sumo_client: SumoClient, case_id: str, iteration: str) -> List[str]:
    """Get a list of grid names for a case and iteration"""
    payload = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.name": iteration}},
                ]
            }
        },
        "aggs": {
            "grid_names": {
                "terms": {
                    "field": "data.name.keyword",
                    "size": 999999,
                }
            }
        },
    }
    response = await sumo_client.post_async("/search", json=payload)

    result = response.json()
    grid_names = result.get("aggregations").get("grid_names").get("buckets")

    return [gp["key"] for gp in grid_names]


# Cant be used for equality on roff
async def get_grid_geometry_checksums(
    sumo_client: SumoClient, case_id: str, iteration: str, grid_name: str
) -> List[str]:
    """Get a list of checksums for a grid geometry in a case and iteration"""
    payload = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.name": iteration}},
                    {"match": {"data.name.keyword": grid_name}},
                ]
            }
        },
        "aggs": {
            "checksums": {
                "terms": {
                    "field": "file.checksum_md5.keyword",
                    "size": 999999,
                }
            }
        },
    }
    response = sumo_client.post_async("/search", json=payload)

    result = response.json()
    checksums = result.get("aggregations").get("checksums").get("buckets")

    return [gp["key"] for gp in checksums]


async def get_grid_geometry_blob_id(
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
    print(hits)
    if len(hits) != 1:
        raise ValueError(f"Expected 1 hit, got {len(hits)}")
    return [hit["_id"] for hit in hits][0]


async def get_grid_parameter_blob_id(
    sumo_client: SumoClient,
    case_id: str,
    iteration: str,
    realization: int,
    grid_name: str,
    parameter_name: str,
) -> str:
    """Get the blob id for a given grid parameter in a case, iteration and realization""" ""
    payload = {
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid_property"}},
                    {"match": {"fmu.iteration.name": iteration}},
                    {"match": {"fmu.realization.id": realization}},
                    {"match": {"data.name.keyword": parameter_name}},
                    {"match": {"data.tagname.keyword": grid_name}},
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


async def get_static_grid_parameter_names(
    sumo_client: SumoClient, case_id: str, iteration: str, grid_name: str
) -> List[str]:
    """Get a list of static grid parameter names for a case, iteration and grid name"""
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid_property"}},
                    {"match": {"fmu.iteration.name": iteration}},
                    {"match": {"fmu.realization.id": 0}},
                    {"match": {"data.tagname.keyword": grid_name}},
                    # filter on static
                ]
            }
        },
        "aggs": {
            "name": {
                "terms": {
                    "field": "data.name.keyword",
                    "size": 999999,
                }
            }
        },
    }
    response = await sumo_client.post_async("/search", json=query)

    result = response.json()
    names = result.get("aggregations").get("name").get("buckets")
    return [name["key"] for name in names]


async def get_nx_ny_nz_for_ensemble_grids(
    sumo_client: SumoClient, case_uuid: str, iteration: str, grid_name: str
) -> List[List[int]]:
    """Get a list of nxnynz for all realizations of a grid model in a case and iteration"""
    payload = {
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_uuid}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.name": iteration}},
                    {"match": {"data.name.keyword": grid_name}},
                ]
            }
        },
        "size": 1000,
    }

    response = await sumo_client.post_async("/search", json=payload)
    result = response.json()
    hits = result["hits"]["hits"]

    nxnynz = []
    for hit in hits:
        spec = hit["_source"]["data"]["spec"]
        nxnynz.append([spec["ncol"], spec["nrow"], spec["nlay"]])
    return nxnynz
