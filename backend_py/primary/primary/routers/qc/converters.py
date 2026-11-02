"""Converters from hydrostatic equilibrium check domain objects to QC API schemas.

The domain and API representations are identical in shape, except that the domain results carry
service-internal `source_object_uuids`. The conversion is a structural re-validation, which drops those fields.
"""

from webviz_services.operations.hydrostatic_equilibrium_check import hydrostatic_equilibrium_types as he_types

from . import schemas


def to_api_vector_check_result(
    result: he_types.HydrostaticVectorCheckResult,
) -> schemas.HydrostaticVectorCheckResult:
    return schemas.HydrostaticVectorCheckResult.model_validate(result.model_dump())


def to_api_grid_check_result(
    result: he_types.HydrostaticGridCheckRealizationResult,
) -> schemas.HydrostaticGridCheckRealizationResult:
    return schemas.HydrostaticGridCheckRealizationResult.model_validate(result.model_dump())
