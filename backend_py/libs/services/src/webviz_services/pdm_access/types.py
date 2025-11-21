from dataclasses import dataclass

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
