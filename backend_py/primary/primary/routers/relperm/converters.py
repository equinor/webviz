from webviz_services.sumo_access.relperm_types import RelpermRealizationData, RelpermTableDefinition

from . import schemas


def to_api_table_definition(table_definition: RelpermTableDefinition) -> schemas.RelpermTableDefinition:
    return schemas.RelpermTableDefinition(
        table_name=table_definition.table_name,
        saturation_axes=[
            schemas.RelpermSaturationAxis(
                saturation_name=saturation_axis.saturation_name,
                relperm_curve_names=saturation_axis.relperm_curve_names,
                capillary_pressure_curve_names=saturation_axis.capillary_pressure_curve_names,
            )
            for saturation_axis in table_definition.saturation_axes
        ],
        satnums=table_definition.satnums,
        realizations=table_definition.realizations,
    )


def to_api_realization_data(realization_data: RelpermRealizationData) -> schemas.RelpermRealizationData:
    return schemas.RelpermRealizationData(
        realization=realization_data.realization,
        satnum=realization_data.satnum,
        saturation_name=realization_data.saturation_name,
        saturation_values=realization_data.saturation_values,
        curve_data=[
            schemas.RelpermCurveData(curve_name=curve.curve_name, curve_values=curve.curve_values)
            for curve in realization_data.curve_data
        ],
    )
