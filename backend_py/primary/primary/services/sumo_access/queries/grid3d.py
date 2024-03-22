from typing import Tuple

from sumo.wrapper import SumoClient


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
    property_name: str,
) -> Tuple[str, str]:
    """Get the blob ids for both grid geometry and grid property in a case, iteration, and realization"""
    payload = {
        "query": {
            "bool": {
                "should": [
                    {
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
                    {
                        "bool": {
                            "must": [
                                {"match": {"_sumo.parent_object.keyword": case_id}},
                                {"match": {"class": "cpgrid_property"}},
                                {"match": {"fmu.iteration.name": iteration}},
                                {"match": {"fmu.realization.id": realization}},
                                {"match": {"data.name.keyword": property_name}},
                                {"match": {"data.tagname.keyword": grid_name}},
                            ]
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
        "size": 2,
    }
    response = await sumo_client.post_async("/search", json=payload)

    result = response.json()
    hits = result["hits"]["hits"]

    if len(hits) != 2:
        raise ValueError(f"Expected 2 hits, got {len(hits)}")

    grid_geometry_id = None
    grid_property_id = None
    for hit in hits:
        if hit["_source"]["class"] == "cpgrid":
            grid_geometry_id = hit["_id"]
        elif hit["_source"]["class"] == "cpgrid_property":
            grid_property_id = hit["_id"]

    if not grid_geometry_id or not grid_property_id:
        raise ValueError("Did not find expected document types")

    return grid_geometry_id, grid_property_id
