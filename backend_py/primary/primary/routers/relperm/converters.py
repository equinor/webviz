from primary.services.relperm_assembler.relperm_assembler import (
    RelPermTableInfo,
    RelPermSaturationAxis,
    RelPermRealizationData,
    CurveData,
    RelPermStatisticalData,
    StatisticalCurveData,
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


def to_api_statistical_curve_data(
    data: StatisticalCurveData,
) -> schemas.StatisticalCurveData:

    return schemas.StatisticalCurveData(
        curve_name=data.curve_name,
        mean_values=data.mean_values.tolist(),
        min_values=data.min_values.tolist(),
        max_values=data.max_values.tolist(),
        p10_values=data.p10_values.tolist(),
        p90_values=data.p90_values.tolist(),
    )


def to_api_relperm_statistical_data(
    data: RelPermStatisticalData,
) -> schemas.RelPermStatisticalData:

    return schemas.RelPermStatisticalData(
        saturation_number=data.saturation_number,
        saturation_name=data.saturation_name,
        saturation_values=data.saturation_values.tolist(),
        curve_statistics=[to_api_statistical_curve_data(stat) for stat in data.curve_statistics],
    )
