from webviz_services.pdm_access.types import (
    WellProductionData as PdmWellProductionData,
    WellInjectionData as PdmWellInjectionData,
)
from .schemas import WellProductionData, WellInjectionData


def per_well_production_data_to_api(
    well_production: list[PdmWellProductionData],
) -> list[WellProductionData]:
    return [
        WellProductionData(
            wellboreUuid=wp.wellbore_uuid,
            wellboreUwi=wp.wellbore_uwbi,
            startDate=wp.start_date,
            endDate=wp.end_date,
            oilProductionSm3=wp.oil_production_sm3,
            gasProductionSm3=wp.gas_production_sm3,
            waterProductionM3=wp.water_production_m3,
        )
        for wp in well_production
    ]


def per_well_injection_data_to_api(
    well_injection: list[PdmWellInjectionData],
) -> list[WellInjectionData]:
    return [
        WellInjectionData(
            wellboreUuid=wi.wellbore_uuid,
            wellboreUwi=wi.wellbore_uwbi,
            startDate=wi.start_date,
            endDate=wi.end_date,
            waterInjection=wi.water_injection,
            gasInjection=wi.gas_injection,
        )
        for wi in well_injection
    ]
