from primary.services.smda_access.types import WellboreGeoHeader, StratigraphicColumn
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


def get_discrete_metadata_for_well_log_curve(log_curve_data: WellboreLogCurveData) -> schemas.DiscreteMetaEntry | None:
    # Curves from the ssdl endpoint do not provide any colors or readable names for the curves that can be shown as discrete.
    # I cannot find an API that provides colors and text for any of these curves, so they will be hardcoded for now.
    # Assuming most are simple "Yes/No" flags, but some specific curve names are handled explicitly, following descriptions from the wiki: https://wiki.equinor.com/wiki/Petrophysics:Data_Management

    if log_curve_data.name == "FLUID_FLAG":
        # Despite being a "flag", this can be an integer from 1 to 5, each for a different liquid.
        # Names are from the wiki
        # ! Colors are just a guess.
        return schemas.DiscreteMetaEntry(
            {
                "Water": (1, (102, 102, 255)),
                "Oil": (2, (38, 0, 77)),
                "Gas": (3, (121, 210, 166)),
                "Oil/Gas": (4, (31, 96, 64)),
                "Uncertain": (5, (230, 230, 230)),
            }
        )
    if log_curve_data.name == "CPI_QUAL_FLAG":
        # Same here, can be from 0 - 4
        # Names are from the wiki
        # ! Colors are just a guess
        return schemas.DiscreteMetaEntry(
            {
                "Unkown/Bad": (0, (255, 51, 0)),
                "Excellent": (0, (51, 204, 51)),
                "Good": (0, (153, 255, 51)),
                "Fair": (0, (255, 255, 77)),
                "Poor": (0, (255, 204, 0)),
            }
        )
    # if log_curve_data.name == "PRES_":

    if log_curve_data.name == "CORE":
        # This curve has curve_alias set to FLAG, but that doesnt really make sense, so no meta is given
        return None
    if log_curve_data.curve_alias == "FLAG" or log_curve_data.name.endswith("FLAG"):
        # We assume all other "FLAG" curves are yes/no curves
        return schemas.DiscreteMetaEntry({"No": (0, (255, 255, 255)), "Yes": (1, (0, 0, 0))})

    return None


def is_drogon_wellbore(wellbore_uuid: str) -> bool:
    return wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]
