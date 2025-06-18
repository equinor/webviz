from primary.services.relperm_assembler.relperm_assembler import (
    RelPermTableInfo,
    RelPermSaturationAxis,
    RelPermRealizationData,
    CurveData,
)

from . import schemas


def to_api_relperm_table_info(table_info: RelPermTableInfo) -> schemas.RelPermTableInfo:

    return schemas.RelPermTableInfo(
        table_name=table_info.table_name,
        saturation_axes=[to_api_relperm_saturation_axis(axis) for axis in table_info.saturation_axes],
        satnums=table_info.satnums,
    )


def to_api_relperm_saturation_axis(axis: RelPermSaturationAxis) -> schemas.RelPermSaturationAxis:

    return schemas.RelPermSaturationAxis(
        saturation_name=axis.saturation_name,
        relperm_curve_names=axis.relperm_curve_names,
        capillary_pressure_curve_names=axis.capillary_pressure_curve_names,
    )


def to_api_curve_data(data: CurveData) -> schemas.CurveData:

    return schemas.CurveData(
        curve_name=data.curve_name,
        curve_values=data.curve_values.tolist(),
    )


def to_api_relperm_realization_data(
    data: RelPermRealizationData,
) -> schemas.RelPermRealizationData:

    return schemas.RelPermRealizationData(
        curve_data_arr=[to_api_curve_data(curve_data) for curve_data in data.curve_data_arr],
        realization_id=data.realization_id,
        saturation_name=data.saturation_name,
        saturation_values=data.saturation_values.tolist(),
        saturation_number=data.saturation_number,
    )
