from primary.services.sumo_access.well_completions_types import (
    Completions,
    WellCompletionsData,
    WellCompletionsUnitInfo,
    WellCompletionsUnits,
    WellCompletionsWell,
    WellCompletionsZone,
)

from . import schemas


def convert_completions_to_schema(completions: Completions) -> schemas.Completions:
    return schemas.Completions(
        sortedCompletionDateIndices=completions.sorted_completion_date_indices,
        open=completions.open,
        shut=completions.shut,
        khMean=completions.kh_mean,
        khMin=completions.kh_min,
        khMax=completions.kh_max,
    )


def convert_well_to_schema(well: WellCompletionsWell) -> schemas.WellCompletionsWell:
    completions = {k: convert_completions_to_schema(v) for k, v in well.completions.items()}
    return schemas.WellCompletionsWell(name=well.name, attributes=well.attributes, completions=completions)


def convert_unit_info_to_schema(unit_info: WellCompletionsUnitInfo) -> schemas.WellCompletionsUnitInfo:
    return schemas.WellCompletionsUnitInfo(unit=unit_info.unit, decimalPlaces=unit_info.decimalPlaces)


def convert_units_to_schema(units: WellCompletionsUnits) -> schemas.WellCompletionsUnits:
    return schemas.WellCompletionsUnits(kh=convert_unit_info_to_schema(units.kh))


def convert_zone_to_schema(zone: WellCompletionsZone) -> schemas.WellCompletionsZone:
    return schemas.WellCompletionsZone(
        name=zone.name,
        subzones=[convert_zone_to_schema(subzone) for subzone in zone.subzones] if zone.subzones else None,
    )


def convert_completions_data_to_schema(data: WellCompletionsData) -> schemas.WellCompletionsData:
    wells = [convert_well_to_schema(well) for well in data.wells]
    return schemas.WellCompletionsData(
        version=data.version,
        units=convert_units_to_schema(data.units),
        zones=[convert_zone_to_schema(zone) for zone in data.zones],
        sortedCompletionDates=data.sorted_completion_dates,
        wells=wells,
    )
