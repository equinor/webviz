from webviz_services.sumo_access.rft_types import RftTableDefinition
from webviz_services.sumo_access.observation_types import RftObservations

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


def to_api_rft_observations(
    observations: list[RftObservations],
) -> list[schemas.RftObservations]:
    """Converts RFT observations from the sumo service to the API format"""
    return [
        schemas.RftObservations(
            well_name=well_observations.well,
            date=well_observations.date,
            observations=[
                schemas.RftObservation(
                    value=observation.value,
                    error=observation.error,
                    property=observation.property,
                    east=observation.east,
                    north=observation.north,
                    tvd=observation.tvd,
                    md=observation.md,
                    zone=observation.zone,
                )
                for observation in well_observations.observations
            ],
        )
        for well_observations in observations
    ]
