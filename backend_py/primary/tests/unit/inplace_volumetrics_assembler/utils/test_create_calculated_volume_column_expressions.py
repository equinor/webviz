import polars as pl
from primary.services.inplace_volumetrics_assembler._utils import (
    create_calculated_volume_column_expressions,
    _create_named_expression_with_nan_for_inf,
    FluidZone,
)


def test_create_calculated_volume_column_expressions_no_fluid_zone() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    first_expected_expression = _create_named_expression_with_nan_for_inf(
        pl.col("STOIIP") + pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL"
    )
    second_expected_expression = _create_named_expression_with_nan_for_inf(
        pl.col("GIIP") + pl.col("ASSOCIATEDGAS"), "GIIP_TOTAL"
    )

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_oil_zone() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes, FluidZone.OIL)

    first_expected_expression = _create_named_expression_with_nan_for_inf(pl.col("STOIIP"), "STOIIP_TOTAL")
    second_expected_expression = _create_named_expression_with_nan_for_inf(pl.col("ASSOCIATEDGAS"), "GIIP_TOTAL")

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_gas_zone() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["GIIP_TOTAL", "STOIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes, FluidZone.GAS)

    first_expected_expression = _create_named_expression_with_nan_for_inf(pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL")
    second_expected_expression = _create_named_expression_with_nan_for_inf(pl.col("GIIP"), "GIIP_TOTAL")

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_missing_columns() -> None:
    volume_df_columns = ["STOIIP"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    assert len(expressions) == 0


def test_create_calculated_volume_column_expressions_partial_columns() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP"]  # Missing ASSOCIATEDGAS when fluid_zone is None
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    expected_expression = _create_named_expression_with_nan_for_inf(
        pl.col("STOIIP") + pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL"
    )

    assert len(expressions) == 1
    assert str(expressions[0]) == str(expected_expression)
