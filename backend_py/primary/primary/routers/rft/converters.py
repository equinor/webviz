from primary.services.sumo_access.rft_types import RftTableDefinition

from . import schemas


def to_api_table_definition(
    table_definition: RftTableDefinition,
) -> schemas.RftTableDefinition:
    """Converts the table definitions from the sumo service to the API format"""
    return schemas.RftTableDefinition(
        response_names=table_definition.response_names,
        well_infos=[
            schemas.RftWellInfo(
                well_name=well_info.well_name,
                timestamps_utc_ms=well_info.timestamps_utc_ms,
            )
            for well_info in table_definition.well_infos
        ],
    )
