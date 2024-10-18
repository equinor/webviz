from pydantic import BaseModel

from primary.services.sumo_access.vfp_types import THP, WFR, GFR, ALQ, FlowRateType, UnitType, TabType


class VfpProdTable(BaseModel):
    isProdTable: bool = True
    tableNumber: int
    datum: float
    thpType: THP
    wfrType: WFR
    gfrType: GFR
    alqType: ALQ
    flowRateType: FlowRateType
    unitType: UnitType
    tabType: TabType
    thpValues: list[float]
    wfrValues: list[float]
    gfrValues: list[float]
    alqValues: list[float]
    flowRateValues: list[float]
    bhpValues: list[float]
    flowRateUnit: str
    thpUnit: str
    wfrUnit: str
    gfrUnit: str
    alqUnit: str
    bhpUnit: str


class VfpInjTable(BaseModel):
    isInjTable: bool = True
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
