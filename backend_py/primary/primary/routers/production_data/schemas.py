from pydantic import BaseModel


class WellProductionData(BaseModel):
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None
    well_uwi: str
    well_uuid: str
    eclipse_well_name: str
