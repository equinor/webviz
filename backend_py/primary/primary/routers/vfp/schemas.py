from enum import StrEnum
from typing import Literal

from pydantic import BaseModel

from primary.services.sumo_access.vfp_types import THP, WFR, GFR, ALQ, FlowRateType, UnitType, TabType


class VfpType(StrEnum):
    PROD = "PROD"
    INJ = "INJ"


class VfpTableBase(BaseModel):
    vfpType: Literal[VfpType.INJ, VfpType.PROD]
    tableNumber: int
    datum: float
    flowRateType: FlowRateType
    unitType: UnitType
    tabType: TabType
    thpValues: list[float]
    flowRateValues: list[float]
    bhpValues: list[float]
    flowRateUnit: str
    thpUnit: str
    bhpUnit: str


class VfpProdTable(VfpTableBase):
    vfpType: Literal[VfpType.PROD] = VfpType.PROD
    thpType: THP
    wfrType: WFR
    gfrType: GFR
    alqType: ALQ
    wfrValues: list[float]
    gfrValues: list[float]
    alqValues: list[float]
    wfrUnit: str
    gfrUnit: str
    alqUnit: str


class VfpInjTable(VfpTableBase):
    vfpType: Literal[VfpType.INJ] = VfpType.INJ
