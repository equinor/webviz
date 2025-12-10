from enum import StrEnum


class _PRODCOLUMNS(StrEnum):
    WB_UUID = "WB_UUID"  # Wellbore UUID
    WELL_UUID = "WELL_UUID"  # Well UUID
    WELL_UWI = "WELL_UWI"  # Well UWI
    WB_UWBI = "WB_UWBI"  # Wellbore UWI
    PROD_DAY = "PROD_DAY"  # Production day
    WB_OIL_VOL_SM3 = "WB_OIL_VOL_SM3"  # Oil volume (Sm3)
    WB_GAS_VOL_SM3 = "WB_GAS_VOL_SM3"  # Gas volume (Sm3)
    WB_WATER_VOL_M3 = "WB_WATER_VOL_M3"  # Water volume (m3)


class _INJCOLUMNS(StrEnum):
    WB_UUID = "WB_UUID"
    WB_UWBI = "WB_UWBI"
    PROD_DAY = "PROD_DAY"
    GOV_FIELD_NAME = "GOV_FIELD_NAME"
    GOV_WB_NAME = "GOV_WB_NAME"
    WELL_UWI = "WELL_UWI"
    INJ_TYPE = "INJ_TYPE"
    WB_INJ_VOL = "WB_INJ_VOL"


class _INJECTIONTYPE(StrEnum):
    GAS = "GI"
    WATER = "WI"


class _PDMEndpoints:
    WELL_PROD_DAY = "flex/WellBoreProdDayCompact"
    WELL_INJ_DAY = "flex/WellBoreInjDayCompact"
