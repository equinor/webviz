from typing import List

from sumo.wrapper import SumoClient


def get_grid_names(sumo_client: SumoClient, case_id: str, iteration: int):
    """Get a list of grid names for a case and iteration"""
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.id": iteration}},
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
    response = sumo_client.post("/search", json=query)

    result = response.json()
    grid_names = result.get("aggregations").get("grid_names").get("buckets")

    return [gp["key"] for gp in grid_names]


# Cant be used for equality on roff
def get_grid_geometry_checksums(sumo_client: SumoClient, case_id: str, iteration: str, grid_name: str):
    """Get a list of checksums for a grid geometry in a case and iteration"""
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid"}},
                    {"match": {"fmu.iteration.id": iteration}},
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
    response = sumo_client.post("/search", json=query)

    result = response.json()
    checksums = result.get("aggregations").get("checksums").get("buckets")

    return [gp["key"] for gp in checksums]


def get_grid_geometry_blob_id(sumo_client: SumoClient, case_id: str, iteration: str, realization: int, grid_name: str):
    """Get a list of checksums for a grid geometry in a case and iteration"""
    print(case_id, iteration, realization, grid_name, flush=True)
    hits = sumo_client.get(
        "/search",
        query=f"_sumo.parent_object:{case_id} AND \
            class.keyword:cpgrid AND \
            fmu.iteration.id:{iteration} AND \
            fmu.realization.id:{realization} AND \
            data.name.keyword:{grid_name}",
        size=1000,
        select="_id",
    )["hits"]["hits"]
    if len(hits) != 1:
        raise ValueError(f"Expected 1 hit, got {len(hits)}")
    return [hit["_id"] for hit in hits][0]


def get_grid_parameter_blob_id(
    sumo_client: SumoClient, case_id: str, iteration: str, realization: int, grid_name: str, parameter_name: str
):
    """Get a list of checksums for a grid geometry in a case and iteration"""
    print(case_id, iteration, realization, grid_name, flush=True)
    hits = sumo_client.get(
        "/search",
        query=f"_sumo.parent_object:{case_id} AND \
            class.keyword:cpgrid_property AND \
            fmu.iteration.id:{iteration} AND \
            fmu.realization.id:{realization} AND \
            data.name.keyword:{parameter_name} AND \
            data.tagname.keyword:{grid_name}",
        size=1000,
        select="_id",
    )["hits"]["hits"]
    if len(hits) != 1:
        raise ValueError(f"Expected 1 hit, got {len(hits)}")
    return [hit["_id"] for hit in hits][0]


def get_static_grid_parameter_names(sumo_client: SumoClient, case_id: str, iteration: str, grid_name: str) -> List[str]:
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "cpgrid_property"}},
                    {"match": {"fmu.iteration.id": iteration}},
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
    response = sumo_client.post("/search", json=query)

    result = response.json()
    names = result.get("aggregations").get("name").get("buckets")
    return [name["key"] for name in names]


def get_nx_ny_nz_for_ensemble_grids(sumo_client: SumoClient, case_uuid: str, iteration: str, grid_name: str):
    """Get a list of nxnynz for all realizations of a grid model in a case and iteration"""

    hits = sumo_client.get(
        "/search",
        query=f"_sumo.parent_object:{case_uuid} AND \
                class.keyword:cpgrid AND \
                fmu.iteration.id:{iteration} AND \
                data.name.keyword:{grid_name}",
        size=1000,
        select="data",
    )["hits"]["hits"]

    nxnynz = []
    for hit in hits:
        spec = hit["_source"]["data"]["spec"]
        nxnynz.append([spec["ncol"], spec["nrow"], spec["nlay"]])
    return nxnynz
