from enum import StrEnum

from pydantic import BaseModel


class FlowVector(StrEnum):
    OIL_PRODUCTION = "oil_production"
    GAS_PRODUCTION = "gas_production"
    WATER_PRODUCTION = "water_production"
    WATER_INJECTION = "water_injection"
    GAS_INJECTION = "gas_injection"
    CO2_INJECTION = "co2_injection"


class FlowInfo(BaseModel):
    flow_type: FlowVector
    start_date: str
    end_date: str


class WellFlowDataInfo(BaseModel):
    flow_vector_arr: list[FlowVector]

    well_uwi: str
    eclipse_well_name: str


class WellFlowData(BaseModel):
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None
    well_uwi: str
    well_uuid: str
    eclipse_well_name: str
