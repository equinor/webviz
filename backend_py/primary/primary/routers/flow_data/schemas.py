from pydantic import BaseModel


class WellProductionData(BaseModel):
    wellboreUuid: str
    wellboreUwi: str
    startDate: str
    endDate: str
    oilProductionSm3: float
    gasProductionSm3: float
    waterProductionM3: float


class WellInjectionData(BaseModel):
    wellboreUuid: str
    wellboreUwi: str
    startDate: str
    endDate: str
    waterInjection: float
    gasInjection: float
