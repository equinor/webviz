from typing import List
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import create_property_column_expressions
from primary.services.inplace_volumetrics_assembler._utils import _create_named_expression_with_nan_for_inf
from primary.services.inplace_volumetrics_assembler._utils import FluidZone


def test_create_property_column_expressions_bo() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties = ["BO"]
    fluid_zone = FluidZone.OIL

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid_zone)
    expected_expression = _create_named_expression_with_nan_for_inf(pl.col("HCPV") / pl.col("STOIIP"), "BO")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_bg() -> None:
    volume_df_columns = ["HCPV", "GIIP"]
    properties = ["BG"]
    fluid_zone = FluidZone.GAS

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid_zone)
    expected_expression = _create_named_expression_with_nan_for_inf(pl.col("HCPV") / pl.col("GIIP"), "BG")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_ntg() -> None:
    volume_df_columns = ["BULK", "NET"]
    properties = ["NTG"]

    created_expressions = create_property_column_expressions(volume_df_columns, properties)
    expected_expression = _create_named_expression_with_nan_for_inf(pl.col("NET") / pl.col("BULK"), "NTG")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_poro_and_poro_net() -> None:
    volume_df_columns = ["BULK", "PORV", "NET"]
    properties = ["PORO", "PORO_NET"]

    created_expressions = create_property_column_expressions(volume_df_columns, properties)
    expected_poro_expression = _create_named_expression_with_nan_for_inf(pl.col("PORV") / pl.col("BULK"), "PORO")
    expected_poro_net_expression = _create_named_expression_with_nan_for_inf(pl.col("PORV") / pl.col("NET"), "PORO_NET")

    assert len(created_expressions) == 2
    assert str(created_expressions[0]) == str(expected_poro_expression)
    assert str(created_expressions[1]) == str(expected_poro_net_expression)


def test_create_property_column_expressions_missing_columns() -> None:
    volume_df_columns = ["HCPV", "PORV"]  # Missing STOIIP for BO
    properties = ["BO", "SW"]
    fluid_zone = FluidZone.OIL

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid_zone)
    expected_expression = _create_named_expression_with_nan_for_inf(1 - pl.col("HCPV") / pl.col("PORV"), "SW")
    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_no_properties() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties: List[str] = []
    fluid_zone = FluidZone.OIL

    expressions = create_property_column_expressions(volume_df_columns, properties, fluid_zone)
    assert len(expressions) == 0


def test_create_property_column_expressions_no_fluid_zone() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties = ["BO"]

    expressions = create_property_column_expressions(volume_df_columns, properties)
    assert len(expressions) == 0
