"""Converters from QcService domain objects to QC API schemas.

The domain and API representations are intentionally identical in shape, so conversion is a simple
structural re-validation. Keeping the two separate decouples the API contract from the service layer.
"""

from webviz_services.qc_service.hydrostatic_equilibrium import hydrostatic_equilibrium_types as he_types

from . import schemas


def to_api_vector_check_result(
    result: he_types.HydrostaticVectorCheckResult,
) -> schemas.HydrostaticVectorCheckResult:
    return schemas.HydrostaticVectorCheckResult.model_validate(result.model_dump())


def to_api_grid_check_result(
    result: he_types.HydrostaticGridCheckRealizationResult,
) -> schemas.HydrostaticGridCheckRealizationResult:
    return schemas.HydrostaticGridCheckRealizationResult.model_validate(result.model_dump())
