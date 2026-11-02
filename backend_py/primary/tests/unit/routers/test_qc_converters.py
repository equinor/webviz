from webviz_services.operations.hydrostatic_equilibrium_check import hydrostatic_equilibrium_types as he_types

from primary.routers.qc import converters, schemas

_TIME_STEPS = he_types.TimeStepPair(
    t0_iso="2020-01-01T00:00:00", t1_iso="2021-01-01T00:00:00", time_gap_days=366.0, time_gap_ok=True
)


def test_to_api_vector_check_result_drops_source_object_uuids() -> None:
    result = he_types.HydrostaticVectorCheckResult(
        time_steps=_TIME_STEPS,
        checked_vector_names=["FOPT", "FWPT"],
        realization_results=[
            he_types.RealizationVectorCheckResult(
                realization=1,
                vector_values=[
                    he_types.VectorCheckValue(vector_name="FOPT", value_at_t1=0.0, is_zero=True),
                    he_types.VectorCheckValue(vector_name="FWPT", value_at_t1=None, is_zero=False),
                ],
            )
        ],
        source_object_uuids=["a", "b"],
    )

    api_result = converters.to_api_vector_check_result(result)

    assert isinstance(api_result, schemas.HydrostaticVectorCheckResult)
    assert "source_object_uuids" not in api_result.model_dump()
    assert api_result.checked_vector_names == ["FOPT", "FWPT"]
    assert api_result.realization_results[0].vector_values[1].value_at_t1 is None
    assert api_result.time_steps.time_gap_days == 366.0


def test_to_api_grid_check_result_drops_nested_source_object_uuids() -> None:
    result = he_types.HydrostaticGridCheckRealizationResult(
        time_steps=_TIME_STEPS,
        grid_name="Geogrid",
        checked_property_names=["PRESSURE"],
        realization_result=he_types.RealizationGridCheckResult(
            realization=4,
            property_values=[
                he_types.GridPropertyCheckValue(property_name="PRESSURE", max_abs_change=0.5, max_rel_change=0.01)
            ],
            source_object_uuids=["a", "b"],
        ),
    )

    api_result = converters.to_api_grid_check_result(result)

    assert isinstance(api_result, schemas.HydrostaticGridCheckRealizationResult)
    assert "source_object_uuids" not in api_result.realization_result.model_dump()
    assert api_result.realization_result.realization == 4
    assert api_result.realization_result.property_values[0].max_abs_change == 0.5
