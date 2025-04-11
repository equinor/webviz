import pytest
import numpy as np

from primary.routers.relperm import router
from primary.services.service_exceptions import NoDataError


async def test_get_relperm_table_names(test_user, sumo_test_ensemble_ahm_new) -> None:

    table_names = await router.get_relperm_table_names(
        test_user,
        sumo_test_ensemble_ahm_new.case_uuid,
        sumo_test_ensemble_ahm_new.ensemble_name,
    )
    assert len(table_names) == 1
    assert table_names[0] == "DROGON"


async def test_get_relperm_table_info(test_user, sumo_test_ensemble_ahm_new) -> None:

    table_info = await router.get_relperm_table_info(
        test_user,
        sumo_test_ensemble_ahm_new.case_uuid,
        sumo_test_ensemble_ahm_new.ensemble_name,
        "DROGON",
    )

    assert table_info.table_name == "DROGON"
    assert len(table_info.saturation_axes) == 2
    first_axis = table_info.saturation_axes[0]
    assert first_axis.saturation_name == "SW"
    assert set(first_axis.relperm_curve_names) == set(["KROW", "KRW"])
    assert first_axis.capillary_pressure_curve_names == ["PCOW"]

    second_axis = table_info.saturation_axes[1]
    assert second_axis.saturation_name == "SG"
    assert set(second_axis.relperm_curve_names) == set(["KROG", "KRG"])
    assert second_axis.capillary_pressure_curve_names == ["PCOG"]


async def test_get_relperm_table_info_invalid_name(test_user, sumo_test_ensemble_ahm_new) -> None:

    with pytest.raises(NoDataError):
        await router.get_relperm_table_info(
            test_user,
            sumo_test_ensemble_ahm_new.case_uuid,
            sumo_test_ensemble_ahm_new.ensemble_name,
            "INVALID_NAME",
        )


async def test_get_relperm_realizations_curve_data(test_user, sumo_test_ensemble_ahm_new) -> None:

    realization_data = await router.get_relperm_realizations_curve_data(
        test_user,
        sumo_test_ensemble_ahm_new.case_uuid,
        sumo_test_ensemble_ahm_new.ensemble_name,
        "DROGON",
        "SW",
        ["KROW", "KRW"],
        1,
    )

    assert len(realization_data) == 100
    first_realization = [realization for realization in realization_data if realization.realization_id == 0][0]
    assert first_realization.saturation_name == "SW"
    assert len(first_realization.curve_data_arr) == 2
    assert set(curve.curve_name for curve in first_realization.curve_data_arr) == set(["KROW", "KRW"])
    krow_curve = [curve for curve in first_realization.curve_data_arr if curve.curve_name == "KROW"][0]
    assert len(krow_curve.curve_values) == 52
    assert np.isclose(np.mean(krow_curve.curve_values), 0.2421, atol=1e-5)
