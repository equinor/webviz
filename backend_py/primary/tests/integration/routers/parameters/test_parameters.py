import pytest
import numpy as np

from primary.routers.parameters import router
from primary.routers.parameters import schemas


@pytest.mark.parametrize(
    ["exclude_constants", "expected_length", "expected_first_name"],
    [
        (True, 74, "FAULT_SEAL_SCALING"),
        (False, 113, "DCONV_ALTERNATIVE"),
    ],
)
async def test_get_parameter_names_and_description(
    test_user, sumo_test_ensemble_ahm, exclude_constants, expected_length, expected_first_name
) -> None:

    parameters = await router.get_parameter_names_and_description(
        test_user,
        sumo_test_ensemble_ahm.case_uuid,
        sumo_test_ensemble_ahm.ensemble_name,
        exclude_all_values_constant=exclude_constants,
        sort_order="alphabetically",
    )

    assert all(isinstance(p, schemas.EnsembleParameterDescription) for p in parameters)
    assert len(parameters) == expected_length

    assert parameters[0].name == expected_first_name


@pytest.mark.parametrize(
    ["parameter_name", "parameter_group_name", "is_log", "real_count", "expected_mean"],
    [
        ("FAULT_SEAL_SCALING", "LOG10_GLOBVAR", True, 100, 2.8239),
        ("DCONV_ALTERNATIVE", "GLOBVAR", False, 100, 2.0),
    ],
)
async def test_get_parameter(
    test_user, sumo_test_ensemble_ahm, parameter_name, parameter_group_name, is_log, real_count, expected_mean
) -> None:

    parameter = await router.get_parameter(
        test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name, parameter_name
    )

    assert isinstance(parameter, schemas.EnsembleParameter)
    assert parameter.name == parameter_name
    assert parameter.group_name == parameter_group_name
    assert parameter.is_logarithmic == is_log
    assert len(parameter.realizations) == real_count
    assert np.isclose(np.mean(parameter.values), expected_mean, atol=1e-5)

async def test_is_sensitivity_run_ahm(test_user, sumo_test_ensemble_ahm) -> None:
    assert await router.is_sensitivity_run(test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name) == True

async def test_is_sensitivity_run_design(test_user, sumo_test_ensemble_design) -> None:
    assert await router.is_sensitivity_run(test_user, sumo_test_ensemble_design.case_uuid, sumo_test_ensemble_design.ensemble_name) == True

async def test_get_sensitivities_ahm(test_user, sumo_test_ensemble_ahm) -> None:
    sensitivities = await router.get_sensitivities(test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name)
    assert all(isinstance(s, schemas.EnsembleSensitivity) for s in sensitivities)
    assert len(sensitivities) == 1
    sens_case = sensitivities[0]
    assert sens_case.name == "APS_input"
    assert sens_case.type == schemas.SensitivityType.MONTECARLO
    assert len(sens_case.cases) == 1
    sens_case_case = sens_case.cases[0]
    assert sens_case_case.name == "p10_p90"
    
async def test_get_sensitivities_design(test_user, sumo_test_ensemble_design) -> None:
    sensitivities = await router.get_sensitivities(test_user, sumo_test_ensemble_design.case_uuid, sumo_test_ensemble_design.ensemble_name)
    assert all(isinstance(s, schemas.EnsembleSensitivity) for s in sensitivities)
    assert len(sensitivities) == 11
    sens_case = next(s for s in sensitivities if s.name == "faultseal")
    assert sens_case.name == "faultseal"
    assert sens_case.type == schemas.SensitivityType.SCENARIO
    assert len(sens_case.cases) == 2
    sens_name = next(c for c in sens_case.cases if c.name == "high")
    assert set(sens_name.realizations) == set(range(110,120))

    sens_case = next(s for s in sensitivities if s.name == "hum")
    assert sens_case.name == "hum"
    assert sens_case.type == schemas.SensitivityType.MONTECARLO
    assert len(sens_case.cases) == 1
    sens_name = next(c for c in sens_case.cases if c.name == "p10_p90")
    assert set(sens_name.realizations) == set(range(10,20))
