from primary.services.relperm_assembler.relperm_assembler import (
    RelPermTableInfo,
    RelPermSaturationAxis,
    RelPermRealizationData,
    RelPermStatisticalDataForSaturation,
    RelPermRealizationCurveData,
    Statistic,
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


def to_api_relperm_realization_data(
    data: RelPermRealizationData,
) -> schemas.RelPermRealizationData:

    return schemas.RelPermRealizationData(
        saturation_axis_data=schemas.CurveData(
            curve_name=data.saturation_axis_data.curve_name,
            curve_values=data.saturation_axis_data.curve_values,
            unit=data.saturation_axis_data.unit,
        ),
        saturation_number=data.saturation_number,
        relperm_curve_data=[
            schemas.RelPermRealizationCurveData(
                curve_name=curve_data.curve_name,
                curve_values=curve_data.curve_values.tolist(),
                realization_id=curve_data.realization_id,
            )
            for curve_data in data.relperm_curve_data
        ],
    )


def _convert_statistic_values_dict_to_schema(
    statistic_values: dict[Statistic, list[float]],
) -> dict[schemas.Statistic, list[float]]:
    """Converts the statistic values dictionary from the service layer format to API format"""
    return {
        _convert_statistic_enum_to_statistic_enum(statistic): values for statistic, values in statistic_values.items()
    }


def _convert_statistic_enum_to_statistic_enum(
    statistic: Statistic,
) -> schemas.Statistic:
    """Converts the statistic enum from the service layer format to API enum"""
    if statistic == Statistic.MEAN:
        return schemas.Statistic.MEAN
    if statistic == Statistic.STD_DEV:
        return schemas.Statistic.STD_DEV
    if statistic == Statistic.MIN:
        return schemas.Statistic.MIN
    if statistic == Statistic.MAX:
        return schemas.Statistic.MAX
    if statistic == Statistic.P10:
        return schemas.Statistic.P10
    if statistic == Statistic.P90:
        return schemas.Statistic.P90

    raise ValueError(f"Unknown statistic value: {statistic.value}")


def to_api_relperm_statistical_data(
    data: RelPermStatisticalDataForSaturation,
) -> schemas.RelPermStatisticalDataForSaturation:
    print(data)
    return schemas.RelPermStatisticalDataForSaturation(
        saturation_axis_data=schemas.CurveData(
            curve_name=data.saturation_axis_data.curve_name,
            curve_values=data.saturation_axis_data.curve_values,
            unit=data.saturation_axis_data.unit,
        ),
        saturation_number=data.saturation_number,
        relperm_curve_data=[
            schemas.RelPermStatisticalCurveData(
                curve_name=curve_data.curve_name,
                curve_values=_convert_statistic_values_dict_to_schema(curve_data.curve_values),
            )
            for curve_data in data.relperm_curve_data
        ],
    )
