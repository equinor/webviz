from typing import List

from webviz_services.sumo_access.parameter_types import EnsembleParameter, EnsembleSensitivity
from . import schemas


def to_api_parameters(parameters: List[EnsembleParameter]) -> List[schemas.EnsembleParameter]:
    """
    Convert Sumo ensemble parameters to API ensemble parameters
    """
    api_parameters = []
    for parameter in parameters:
        api_parameters.append(
            schemas.EnsembleParameter(
                name=parameter.name,
                isLogarithmic=parameter.is_logarithmic,
                isDiscrete=parameter.is_discrete,
                isConstant=parameter.is_constant,
                groupName=parameter.group_name,
                descriptiveName=parameter.descriptive_name,
                realizations=parameter.realizations,
                values=parameter.values,
            )
        )
    return api_parameters


def to_api_sensitivities(sensitivities: List[EnsembleSensitivity]) -> List[schemas.EnsembleSensitivity]:
    """
    Convert Sumo ensemble sensitivities to API ensemble sensitivities
    """
    api_sensitivities = []
    for sensitivity in sensitivities:
        api_sensitivities.append(
            schemas.EnsembleSensitivity(
                name=sensitivity.name,
                type=schemas.SensitivityType(sensitivity.type.value),
                cases=[
                    schemas.EnsembleSensitivityCase(
                        name=case.name,
                        realizations=case.realizations,
                    )
                    for case in sensitivity.cases
                ],
            )
        )
    return api_sensitivities
