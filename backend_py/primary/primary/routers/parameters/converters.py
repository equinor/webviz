from webviz_services.sumo_access.parameter_types import EnsembleParameter, EnsembleSensitivity, ParameterSourceEnsemble
from . import schemas


def to_api_parameters(parameters: list[EnsembleParameter]) -> list[schemas.EnsembleParameter]:
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
                isNumerical=parameter.is_numerical,
                groupName=parameter.group_name,
                descriptiveName=parameter.descriptive_name,
                realizations=parameter.realizations,
                values=parameter.values,
                sourceEnsemble=_to_api_source_ensemble(parameter.source_ensemble),
            )
        )
    return api_parameters


def _to_api_source_ensemble(
    source_ensemble: ParameterSourceEnsemble | None,
) -> schemas.ParameterSourceEnsemble | None:
    if source_ensemble is None:
        return None
    return schemas.ParameterSourceEnsemble(
        caseUuid=source_ensemble.case_uuid,
        caseName=source_ensemble.case_name,
        ensembleName=source_ensemble.ensemble_name,
    )


def to_api_sensitivities(sensitivities: list[EnsembleSensitivity]) -> list[schemas.EnsembleSensitivity]:
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
