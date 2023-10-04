from typing import List, Dict, Union
import pytest

import pandas as pd
from services.sumo_access.parameter_access import (
    create_ensemble_parameter,
    create_ensemble_sensitivities,
    find_sensitivity_type,
    create_ensemble_sensitivity_cases,
)
from services.sumo_access.parameter_types import (
    EnsembleParameter,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    SensitivityType,
)

from services.sumo_access.queries.parameters import SumoEnsembleParameter


@pytest.mark.parametrize(
    "sumo_param_input, expected_output",
    [
        (
            SumoEnsembleParameter(
                name="LOG10_PARAM", groupname="group1", values=[1.0, 1.0, 1.0], realizations=[0, 1, 2]
            ),
            EnsembleParameter(
                name="LOG10_PARAM",
                is_logarithmic=True,
                is_numerical=True,
                is_constant=True,
                group_name="group1",
                descriptive_name="LOG10_PARAM (log)",
                values=[1.0, 1.0, 1.0],
                realizations=[0, 1, 2],
            ),
        ),
        (
            SumoEnsembleParameter(name="PARAM", values=[1.0, 2.0, 3.0], realizations=[0, 1, 2]),
            EnsembleParameter(
                name="PARAM",
                is_logarithmic=False,
                is_numerical=True,
                is_constant=False,
                group_name=None,
                descriptive_name="PARAM",
                values=[1.0, 2.0, 3.0],
                realizations=[0, 1, 2],
            ),
        ),
    ],
)
def test_create_ensemble_parameter(sumo_param_input: SumoEnsembleParameter, expected_output: EnsembleParameter) -> None:
    ensemble_param = create_ensemble_parameter(sumo_param_input)
    assert ensemble_param == expected_output


@pytest.mark.parametrize(
    "sumo_param_input, expected_output",
    [
        (
            [
                SumoEnsembleParameter(
                    name="SENSNAME", groupname=None, values=["SENS_A", "SENS_B", "SENS_B"], realizations=[0, 1, 2]
                ),
                SumoEnsembleParameter(
                    name="SENSCASE", groupname=None, values=["p10_p90", "low", "high"], realizations=[0, 1, 2]
                ),
            ],
            [
                EnsembleSensitivity(
                    name="SENS_A",
                    type=SensitivityType.MONTECARLO,
                    cases=[EnsembleSensitivityCase(name="p10_p90", realizations=[0])],
                ),
                EnsembleSensitivity(
                    name="SENS_B",
                    type=SensitivityType.SCENARIO,
                    cases=[
                        EnsembleSensitivityCase(name="high", realizations=[2]),
                        EnsembleSensitivityCase(name="low", realizations=[1]),
                    ],
                ),
            ],
        ),
    ],
)
def test_create_ensemble_sensitivities(
    sumo_param_input: SumoEnsembleParameter, expected_output: EnsembleParameter
) -> None:
    sensitivities = create_ensemble_sensitivities(sumo_param_input)

    assert sensitivities == expected_output


@pytest.mark.parametrize(
    "sens_case_names, expected_output",
    [
        (["p10_p90"], SensitivityType.MONTECARLO),
        (["case1", "case2"], SensitivityType.SCENARIO),
    ],
)
def test_find_sensitivity_type(sens_case_names: List[str], expected_output: SensitivityType) -> None:
    assert find_sensitivity_type(sens_case_names) == expected_output


@pytest.mark.parametrize(
    "sens_case_input, expected_output",
    [
        (
            {"case": ["case1", "case1", "case2", "case2"], "REAL": [0, 1, 2, 3]},
            [
                EnsembleSensitivityCase(name="case1", realizations=[0, 1]),
                EnsembleSensitivityCase(name="case2", realizations=[2, 3]),
            ],
        ),
    ],
)
def test_create_ensemble_sensitivity_cases(
    sens_case_input: Dict[str, list[Union[str, float]]], expected_output: List[EnsembleSensitivityCase]
) -> None:
    df = pd.DataFrame(sens_case_input)
    cases = create_ensemble_sensitivity_cases(df)

    assert cases == expected_output
