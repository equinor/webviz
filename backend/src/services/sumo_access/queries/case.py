from typing import List

from sumo.wrapper import SumoClient


async def get_stratigraphic_column_identifier(sumo_client: SumoClient, case_id: str) -> str:
    """Get stratigraphic column identifier for a case (assuming unique for all objects)"""
    query = {
        "size": 1,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                ]
            }
        },
    }
    response = await sumo_client.post_async("/search", json=query)
    result = response.json()
    hits = result["hits"]["hits"]
    return hits[0]["_source"]["masterdata"]["smda"]["stratigraphic_column"]["identifier"]


async def get_field_identifiers(sumo_client: SumoClient, case_id: str) -> List[str]:
    """Get field identifiers for a case (assuming unique for all objects)"""
    query = {
        "size": 1,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                ]
            }
        },
    }
    response = await sumo_client.post_async("/search", json=query)
    result = response.json()
    hits = result["hits"]["hits"]
    fields = hits[0]["_source"]["masterdata"]["smda"]["field"]
    return [field["identifier"] for field in fields]
