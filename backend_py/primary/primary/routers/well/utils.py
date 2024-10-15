from primary.services.smda_access.types import WellboreGeoHeader
from primary.services.ssdl_access.types import WellboreLogCurveHeader

from . import schemas

def curve_type_from_header(
    curve_header: WellboreLogCurveHeader | WellboreGeoHeader,
) -> schemas.WellLogCurveTypeEnum:
    if isinstance(curve_header, WellboreGeoHeader):
        return schemas.WellLogCurveTypeEnum.DISCRETE
    if curve_header.curve_name.endswith("_FLAG"):
        return schemas.WellLogCurveTypeEnum.FLAG
    if curve_header.curve_unit == "UNITLESS":
        return schemas.WellLogCurveTypeEnum.DISCRETE

    return schemas.WellLogCurveTypeEnum.CONTINUOUS
