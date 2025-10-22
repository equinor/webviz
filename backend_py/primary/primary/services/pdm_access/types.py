from dataclasses import dataclass
from enum import StrEnum


@dataclass
class WellProductionData:
    wellbore_uuid: str
    wellbore_uwbi: str
    start_date: str
    end_date: str
    oil_production_sm3: float
    gas_production_sm3: float
    water_production_m3: float


@dataclass
class WellInjectionData:
    wellbore_uuid: str
    start_date: str
    end_date: str
    water_injection: float
    gas_injection: float


class PRODCOLUMNS(StrEnum):
    WB_UUID = "WB_UUID"  # Wellbore UUID
    WELL_UUID = "WELL_UUID"  # Well UUID
    WELL_UWI = "WELL_UWI"  # Well UWI
    WB_UWBI = "WB_UWBI"  # Wellbore UWI
    PROD_DAY = "PROD_DAY"  # Production day
    WB_OIL_VOL_SM3 = "WB_OIL_VOL_SM3"  # Oil volume (Sm3)
    WB_GAS_VOL_SM3 = "WB_GAS_VOL_SM3"  # Gas volume (Sm3)
    WB_WATER_VOL_M3 = "WB_WATER_VOL_M3"  # Water volume (m3)


class INJCOLUMNS(StrEnum):
    WB_UUID = "WB_UUID"
    WB_UWBI = "WB_UWBI"
    PROD_DAY = "PROD_DAY"
    GOV_FIELD_NAME = "GOV_FIELD_NAME"
    GOV_WB_NAME = "GOV_WB_NAME"
    WELL_UWI = "WELL_UWI"
    INJ_TYPE = "INJ_TYPE"
    WB_INJ_VOL = "WB_INJ_VOL"


class INJECTIONTYPE(StrEnum):
    GAS = "GI"
    WATER = "WI"
