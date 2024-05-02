from sumo.wrapper import SumoClient


async def get_timeseries_column_names_for_realization(
    sumo_client: SumoClient,
    case_id: str,
    table_name: str,
    iteration: str,
    realization: int,
) -> list[str]:
    """Get the column names for a given timeseries table in a case, iteration and realization"""
    payload = {
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"class": "table"}},
                    {"match": {"data.content": "timeseries"}},
                    {"match": {"fmu.iteration.name.keyword": iteration}},
                    {"match": {"fmu.realization.id": realization}},
                    {"match": {"data.name": table_name}},
                ]
            }
        },
    }

    response = await sumo_client.post_async("/search", json=payload)

    result = response.json()

    hits = result["hits"]["hits"]
    if len(hits) != 1:
        raise ValueError(f"Expected 1 hit, got {len(hits)}")
    return hits[0]["_source"]["data"]["spec"]["columns"]
