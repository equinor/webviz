import re as regex
from primary.services.smda_access.types import (
    WellboreGeoHeader,
    WellboreGeoData,
    StratigraphicColumn,
    WellboreStratigraphicUnit,
)
from primary.services.ssdl_access.types import WellboreLogCurveHeader, WellboreLogCurveData

from . import schemas


def curve_type_from_header(
    curve_header: WellboreLogCurveHeader | WellboreGeoHeader | StratigraphicColumn,
) -> schemas.WellLogCurveTypeEnum:
    if isinstance(curve_header, WellboreGeoHeader):
        return schemas.WellLogCurveTypeEnum.DISCRETE
    if isinstance(curve_header, StratigraphicColumn):
        return schemas.WellLogCurveTypeEnum.DISCRETE
    if curve_header.curve_name.endswith("FLAG"):
        return schemas.WellLogCurveTypeEnum.FLAG
    if curve_header.curve_unit == "UNITLESS":
        return schemas.WellLogCurveTypeEnum.DISCRETE

    return schemas.WellLogCurveTypeEnum.CONTINUOUS


def build_discrete_value_meta_for_ssdl_curve(
    log_curve_data: WellboreLogCurveData,
) -> list[schemas.DiscreteValueMetadata] | None:
    # Curves from the ssdl endpoint do not provide any colors or readable names for the curves that can be shown as discrete.
    # I cannot find an API that provides colors and text for any of these curves, so they will be hardcoded for now.
    # Assuming most are simple "Yes/No" flags, but some specific curve names are handled explicitly, following descriptions from the wiki: https://wiki.equinor.com/wiki/Petrophysics:Data_Management

    if log_curve_data.name == "FLUID_FLAG":
        # Despite being a "flag", this can be an integer from 1 to 5, each for a different liquid.
        # Names are from the wiki
        # ! Colors are just a guess.
        return [
            schemas.DiscreteValueMetadata(code=1, rgbColor=(102, 102, 255), identifier="Water"),
            schemas.DiscreteValueMetadata(code=2, rgbColor=(38, 0, 77), identifier="Oil"),
            schemas.DiscreteValueMetadata(code=3, rgbColor=(121, 210, 166), identifier="Gas"),
            schemas.DiscreteValueMetadata(code=4, rgbColor=(31, 96, 64), identifier="Oil/Gas"),
            schemas.DiscreteValueMetadata(code=5, rgbColor=(230, 230, 230), identifier="Uncertain"),
        ]

    if regex.search("_QUAL_|_QUAL$", log_curve_data.name):
        # Another "flag" variant, describing quality. Can be from 0 - 4
        # Names are from the wiki
        # ! Colors are just a guess
        return [
            schemas.DiscreteValueMetadata(code=0, rgbColor=(200, 51, 0), identifier="Unkown/Bad"),
            schemas.DiscreteValueMetadata(code=1, rgbColor=(51, 204, 51), identifier="Excellent"),
            schemas.DiscreteValueMetadata(code=2, rgbColor=(153, 255, 51), identifier="Good"),
            schemas.DiscreteValueMetadata(code=3, rgbColor=(255, 255, 77), identifier="Fair"),
            schemas.DiscreteValueMetadata(code=4, rgbColor=(255, 204, 0), identifier="Poor"),
        ]
    if log_curve_data.name == "CORE":
        # This specific curve has curve_alias set to FLAG, but it represents the core's own number,
        # so we just wanna render the numbers out as is
        return None
    if log_curve_data.curve_alias == "FLAG" or log_curve_data.name.endswith("FLAG"):
        # We assume all other "FLAG" curves are yes/no curves
        return [
            schemas.DiscreteValueMetadata(code=0, rgbColor=(255, 255, 255), identifier="No"),
            schemas.DiscreteValueMetadata(code=1, rgbColor=(0, 0, 0), identifier="Yes"),
        ]

    return None


def build_discrete_value_meta_for_geo_data(
    geo_data_entries: list[WellboreGeoData],
) -> list[schemas.DiscreteValueMetadata] | None:
    seen_codes = set()
    metadata = []

    for geo_data in geo_data_entries:
        if geo_data.code not in seen_codes:
            seen_codes.add(geo_data.code)
            metadata.append(
                schemas.DiscreteValueMetadata(
                    code=geo_data.code,
                    identifier=geo_data.identifier,
                    rgbColor=(
                        geo_data.color_r,
                        geo_data.color_g,
                        geo_data.color_b,
                    ),
                )
            )

    return metadata if metadata else None


def build_discrete_value_meta_for_strat_data_and_codes(
    strat_units: list[WellboreStratigraphicUnit], ident_to_code_map: dict[str, int]
) -> list[schemas.DiscreteValueMetadata] | None:
    seen_codes = set()
    metadata = []

    for unit in strat_units:
        code = ident_to_code_map[unit.strat_unit_identifier]

        if code not in seen_codes:
            seen_codes.add(code)
            metadata.append(
                schemas.DiscreteValueMetadata(
                    code=code,
                    identifier=unit.strat_unit_identifier,
                    rgbColor=(
                        unit.color_r,
                        unit.color_g,
                        unit.color_b,
                    ),
                )
            )

    return metadata or None
