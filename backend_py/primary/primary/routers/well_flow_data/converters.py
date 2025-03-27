from primary.services.well_flow_data_assembler.well_flow_data_assembler import (
    WellFlowData,
    WellFlowDataInfo,
    FlowVector,
)
from . import schemas


def to_api_flow_vector(flow_vector: FlowVector) -> schemas.FlowVector:

    return schemas.FlowVector(flow_vector.value)


def to_api_well_flow_data_info(
    well_flow_data_info: list[WellFlowDataInfo],
) -> list[schemas.WellFlowDataInfo]:

    return [
        schemas.WellFlowDataInfo(
            flow_vector_arr=[to_api_flow_vector(flow_vector) for flow_vector in well.flow_vector_arr],
            well_uwi=well.well_uwi,
            eclipse_well_name=well.eclipse_well_name,
        )
        for well in well_flow_data_info
    ]


def to_api_well_flow_data(
    well_production_data: list[WellFlowData],
) -> list[schemas.WellFlowData]:

    return [
        schemas.WellFlowData(
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
