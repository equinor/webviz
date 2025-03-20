from primary.services.production_data_assembler.production_data_assembler import WellProductionData
from . import schemas


def to_api_well_production_data(well_production_data: list[WellProductionData]) -> list[schemas.WellProductionData]:

    return [
        schemas.WellProductionData(
            oil_production_volume=well.oil_production_volume,
            gas_production_volume=well.gas_production_volume,
            water_production_volume=well.water_production_volume,
            water_injection_volume=well.water_injection_volume,
            gas_injection_volume=well.gas_injection_volume,
            co2_injection_volume=well.co2_injection_volume,
            well_uwi=well.well_uwi,
            well_uuid=well.well_uuid,
            eclipse_well_name=well.eclipse_well_name,
        )
        for well in well_production_data
    ]
