from typing import List

import numpy as np
import pandas as pd

from ..types.parameter_types import (
    EnsembleParameters,
    EnsembleParameter,
    EnsembleSensitivity,
    EnsembleSensitivityCase,
    SensitivityType,
    SumoEnsembleParameter,
)


def create_ensemble_parameters(sumo_ensemble_parameters: List[SumoEnsembleParameter]) -> EnsembleParameters:
    """Create an EnsembleParameters object from a list of SumoEnsembleParameter objects"""

    ensemble_sensitivities = None

    # Handle sensitivities
    sens_name_parameter = next(
        (parameter for parameter in sumo_ensemble_parameters if parameter.name == "SENSNAME"), None
    )
    sens_case_parameter = next(
        (parameter for parameter in sumo_ensemble_parameters if parameter.name == "SENSCASE"), None
    )
    if sens_name_parameter is not None and sens_case_parameter is not None:
        ensemble_sensitivities = create_ensemble_sensitivities(sens_name_parameter, sens_case_parameter)

    return EnsembleParameters(
        parameters=[create_ensemble_parameter(sumo_parameter) for sumo_parameter in sumo_ensemble_parameters],
        sensitivities=ensemble_sensitivities,
    )


def create_ensemble_parameter(sumo_parameter: SumoEnsembleParameter) -> EnsembleParameter:
    """Create an EnsembleParameter object from a parameter object"""

    return EnsembleParameter(
        name=sumo_parameter.name,
        is_logarithmic=sumo_parameter.name.startswith("LOG10_"),
        is_numerical=is_array_numeric(np.array(sumo_parameter.values)),
        is_constant=all(value == sumo_parameter.values[0] for value in sumo_parameter.values),
        group_name=sumo_parameter.groupname,
        descriptive_name=f"{sumo_parameter.name} (log)"
        if sumo_parameter.name.startswith("LOG10_")
        else sumo_parameter.name,
        values=sumo_parameter.values,
        realizations=sumo_parameter.realizations,
    )


def create_ensemble_sensitivities(
    sensitivity_name: SumoEnsembleParameter, sensitivity_case: SumoEnsembleParameter
) -> List[EnsembleSensitivity]:
    """Create a list of EnsembleSensitivity objects from a sensitivity name parameter and a sensitivity case parameter"""
    sensitivities = []
    df = pd.DataFrame(
        {
            "name": sensitivity_name.values,
            "case": sensitivity_case.values,
            "REAL": sensitivity_case.realizations,
        }
    )
    for name, group in df.groupby("name"):
        sensitivities.append(
            EnsembleSensitivity(
                name=name,
                type=find_sensitivity_type(list(group["case"].unique())),
                cases=create_ensemble_sensitivity_cases(group),
            )
        )
    return sensitivities


def find_sensitivity_type(sens_case_names: List[str]) -> str:
    """Find the sensitivity type based on the sensitivity case names"""
    if len(sens_case_names) == 1 and sens_case_names[0] == "p10_p90":
        return SensitivityType.MONTECARLO
    return SensitivityType.SCENARIO


def create_ensemble_sensitivity_cases(df: pd.DataFrame) -> List[EnsembleSensitivityCase]:
    """Create a list of EnsembleSensitivityCase objects from a dataframe"""
    cases = []
    for case_name, case_df in df.groupby("case"):
        cases.append(
            EnsembleSensitivityCase(
                name=case_name,
                realizations=case_df["REAL"].unique().tolist(),
            )
        )
    return cases


def is_array_numeric(array: np.ndarray) -> bool:
    """Check if an array is numeric"""
    return np.issubdtype(array.dtype, np.number)
