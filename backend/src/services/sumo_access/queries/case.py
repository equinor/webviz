from typing import List

from sumo.wrapper import SumoClient


def get_stratigraphic_column_identifier(sumo_client: SumoClient, case_id: str) -> str:
    """Get stratigraphic column identifier for a case (assuming unique for all objects)"""
    hits = sumo_client.get(
        "/search",
        query=f"_sumo.parent_object:{case_id}",
        size=1,
        select="masterdata.smda.stratigraphic_column.identifier",
    )["hits"]["hits"]
    return hits[0]["_source"]["masterdata"]["smda"]["stratigraphic_column"]["identifier"]


def get_field_identifiers(sumo_client: SumoClient, case_id: str) -> List[str]:
    """Get field identifiers for a case (assuming unique for all objects)"""
    hits = sumo_client.get(
        "/search",
        query=f"_sumo.parent_object:{case_id}",
        size=1,
        select="masterdata.smda.field.identifier",
    )["hits"]["hits"]
    fields = hits[0]["_source"]["masterdata"]["smda"]["field"]
    return [field["identifier"] for field in fields]
