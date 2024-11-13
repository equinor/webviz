from primary.services.relperm_assembler.relperm_assembler import (
    RelPermTableInfo,
    RelPermSaturationAxis,
    RelPermRealizationDataForSaturation,
    CurveData,
    RealizationCurveData,
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
    data: RelPermRealizationDataForSaturation,
) -> schemas.RelPermRealizationDataForSaturation:

    return schemas.RelPermRealizationDataForSaturation(
        saturation_axis_data=schemas.CurveData(
            curve_name=data.saturation_axis_data.curve_name,
            curve_values=data.saturation_axis_data.curve_values,
            unit=data.saturation_axis_data.unit,
        ),
        saturation_number=data.saturation_number,
        relperm_curve_data=[
            schemas.RealizationCurveData(
                curve_name=curve_data.curve_name,
                curve_values=curve_data.curve_values.tolist(),
                realization_id=curve_data.realization_id,
            )
            for curve_data in data.relperm_curve_data
        ],
    )
