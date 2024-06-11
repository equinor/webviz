from typing import List

from primary.services.smda_access.types import WellborePick, StratigraphicUnit

from . import schemas


def convert_wellbore_picks_to_schema(wellbore_picks: List[WellborePick]) -> List[schemas.WellborePick]:
    return [
        schemas.WellborePick(
            northing=pick.northing,
            easting=pick.easting,
            tvd=pick.tvd,
            tvdMsl=pick.tvd_msl,
            md=pick.md,
            mdMsl=pick.md_msl,
            uniqueWellboreIdentifier=pick.unique_wellbore_identifier,
            pickIdentifier=pick.pick_identifier,
            confidence=pick.confidence,
            depthReferencePoint=pick.depth_reference_point,
            mdUnit=pick.md_unit,
        )
        for pick in wellbore_picks
    ]


def convert_stratigraphic_units_to_schema(
    stratigraphic_units: List[StratigraphicUnit],
) -> List[schemas.StratigraphicUnit]:
    return [
        schemas.StratigraphicUnit(
            identifier=unit.identifier,
            top=unit.top,
            base=unit.base,
            stratUnitLevel=unit.strat_unit_level,
            stratUnitType=unit.strat_unit_type,
            topAge=unit.top_age,
            baseAge=unit.base_age,
            stratUnitParent=unit.strat_unit_parent,
            colorR=unit.color_r,
            colorG=unit.color_g,
            colorB=unit.color_b,
            lithologyType=unit.lithology_type,
        )
        for unit in stratigraphic_units
    ]
