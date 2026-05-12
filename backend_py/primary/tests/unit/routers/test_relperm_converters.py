from primary.routers.relperm.converters import to_api_realization_data_response
from webviz_services.sumo_access.relperm_types import RelpermCurveData, RelpermRealizationData


def test_to_api_realization_data_response_shares_saturation_values_by_satnum() -> None:
    response = to_api_realization_data_response(
        [
            RelpermRealizationData(
                realization=0,
                satnum=1,
                saturation_name="SW",
                saturation_values=[0.0, 0.5, 1.0],
                curve_data=[RelpermCurveData(curve_name="KRW", curve_values=[0.0, 0.4, 1.0])],
            ),
            RelpermRealizationData(
                realization=1,
                satnum=1,
                saturation_name="SW",
                saturation_values=[0.0, 0.5, 1.0],
                curve_data=[RelpermCurveData(curve_name="KRW", curve_values=[0.0, 0.5, 1.0])],
            ),
            RelpermRealizationData(
                realization=0,
                satnum=2,
                saturation_name="SW",
                saturation_values=[0.2, 0.6, 1.0],
                curve_data=[RelpermCurveData(curve_name="KRW", curve_values=[0.0, 0.3, 0.8])],
            ),
        ]
    )

    assert response.saturation_name == "SW"
    assert [item.model_dump() for item in response.saturation_values_by_satnum] == [
        {"satnum": 1, "saturation_values": [0.0, 0.5, 1.0]},
        {"satnum": 2, "saturation_values": [0.2, 0.6, 1.0]},
    ]
    assert [item.model_dump() for item in response.realization_data] == [
        {
            "realization": 0,
            "satnum": 1,
            "curve_data": [{"curve_name": "KRW", "curve_values": [0.0, 0.4, 1.0]}],
        },
        {
            "realization": 1,
            "satnum": 1,
            "curve_data": [{"curve_name": "KRW", "curve_values": [0.0, 0.5, 1.0]}],
        },
        {
            "realization": 0,
            "satnum": 2,
            "curve_data": [{"curve_name": "KRW", "curve_values": [0.0, 0.3, 0.8]}],
        },
    ]
