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
        curve_data=[
            schemas.RelpermCurveData(curve_name=curve.curve_name, curve_values=curve.curve_values)
            for curve in realization_data.curve_data
        ],
    )


def to_api_realization_data_response(
    realization_data_arr: list[RelpermRealizationData],
) -> schemas.RelpermRealizationDataResponse:
    saturation_name = realization_data_arr[0].saturation_name if realization_data_arr else ""
    saturation_values_by_satnum: dict[int, list[float]] = {}

    for realization_data in realization_data_arr:
        if realization_data.satnum not in saturation_values_by_satnum:
            saturation_values_by_satnum[realization_data.satnum] = realization_data.saturation_values

    return schemas.RelpermRealizationDataResponse(
        saturation_name=saturation_name,
        saturation_values_by_satnum=[
            schemas.RelpermSaturationValues(satnum=satnum, saturation_values=saturation_values)
            for satnum, saturation_values in sorted(saturation_values_by_satnum.items())
        ],
        realization_data=[to_api_realization_data(item) for item in realization_data_arr],
    )
