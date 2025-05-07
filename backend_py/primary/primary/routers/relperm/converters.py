from primary.services.relperm_assembler.relperm_assembler import (
    RelPermTableInfo,
    RelPermSaturationAxis,
    RelPermRealizationData,
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


def to_api_relperm_ensemble_data(data: RelPermRealizationData) -> schemas.RelPermRealizationData:

    return schemas.RelPermRealizationData(
        saturation_axis_data=data.saturation_axis_data,
        satnum_data=[
            schemas.RelPermSatNumData(satnum=satnum_data.satnum, relperm_curves_data=satnum_data.relperm_curves_data)
            for satnum_data in data.satnum_data
        ],
        realization=data.realization,
    )
