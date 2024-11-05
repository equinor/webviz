from typing import List
from dataclasses import dataclass
from sumo.wrapper import SumoClient
from ..relperm_types import RelPermTableInfo, RealizationBlobid


async def get_relperm_table_names_and_columns(
    sumo_client: SumoClient, case_id: str, iteration_name: str
) -> List[RelPermTableInfo]:
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"term": {"_sumo.parent_object.keyword": case_id}},
                    {"term": {"fmu.iteration.name.keyword": iteration_name}},
                    {"term": {"class.keyword": "table"}},
                    {"term": {"fmu.context.stage.keyword": "realization"}},
                    {"term": {"data.content.keyword": "relperm"}},
                ]
            }
        },
        "aggs": {
            "table_names": {
                "terms": {"field": "data.name.keyword", "size": 1000},
                "aggs": {"column_names": {"terms": {"field": "data.spec.columns.keyword"}}},
            }
        },
    }
    response = await sumo_client.post_async("/search", json=query)
    result = response.json()
    aggs = result.get("aggregations", {})
    table_names = aggs.get("table_names", {}).get("buckets", [])
    table_infos: List[RelPermTableInfo] = []
    for table_name in table_names:
        column_names_aggs = table_name.get("column_names", {}).get("buckets", [])
        column_names = [column_name.get("key") for column_name in column_names_aggs]
        table_info = RelPermTableInfo(table_name=table_name.get("key"), column_names=column_names)
        table_infos.append(table_info)
    return table_infos


async def get_relperm_realization_table_blob_uuids(
    sumo_client: SumoClient, case_id: str, iteration_name: str, table_name: str
) -> List[RealizationBlobid]:
    query = {
        "size": 1,
        "query": {
            "bool": {
                "must": [
                    {"term": {"_sumo.parent_object.keyword": case_id}},
                    {"term": {"fmu.iteration.name.keyword": iteration_name}},
                    {"term": {"class.keyword": "table"}},
                    {"term": {"fmu.context.stage.keyword": "realization"}},
                    {"term": {"data.content.keyword": "relperm"}},
                    {"term": {"data.name.keyword": table_name}},
                ]
            }
        },
        "aggs": {
            "key_combinations": {
                "composite": {
                    "size": 65535,
                    "sources": [
                        {"k_blob_names": {"terms": {"field": "_sumo.blob_name.keyword"}}},
                        {"k_realizations": {"terms": {"field": "fmu.realization.id"}}},
                    ],
                }
            }
        },
    }
    response = await sumo_client.post_async("/search", json=query)
    result = response.json()
    aggs = result.get("aggregations", {})

    key_combinations = aggs.get("key_combinations", {}).get("buckets", [])
    realization_blobids = []
    for key_combination in key_combinations:
        blob_name = key_combination.get("key").get("k_blob_names")
        realization_id = key_combination.get("key").get("k_realizations")
        realization_blobid = RealizationBlobid(blob_name=blob_name, realization_id=realization_id)
        realization_blobids.append(realization_blobid)
    return realization_blobids
