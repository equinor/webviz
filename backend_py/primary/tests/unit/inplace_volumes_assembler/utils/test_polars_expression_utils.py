import numpy as np
import polars as pl
from primary.services.inplace_volumes_table_assembler._utils.polars_expression_utils import (
    create_calculated_volume_column_expressions,
    create_property_column_expressions,
    create_named_expression_with_nan_for_inf,
)

from primary.services.sumo_access.inplace_volumes_table_types import InplaceVolumes


def test_create_named_expression_with_nan_for_inf_regular_value() -> None:
    """Test that regular values are preserved."""
    df = pl.DataFrame({"a": [1.0, 2.0, 3.0]})
    expr = pl.col("a") * 2
    named_expr = create_named_expression_with_nan_for_inf(expr, "doubled")

    result = df.select(named_expr)

    assert result.columns == ["doubled"]
    assert result["doubled"].to_list() == [2.0, 4.0, 6.0]


def test_create_named_expression_with_nan_for_inf_with_inf() -> None:
    """Test that infinite values are replaced with NaN."""
    df = pl.DataFrame({"a": [1.0, 4.0, 2.0], "b": [2.0, 0.0, 8.0]})
    expr = pl.col("a") / pl.col("b")  # Will cause division by zero -> inf
    named_expr = create_named_expression_with_nan_for_inf(expr, "div_by_zero")

    result = df.select(named_expr)

    assert result.columns == ["div_by_zero"]
    assert result["div_by_zero"].to_list()[0] == 0.5
    assert np.isnan(result["div_by_zero"].to_list()[1])  # Should be NaN due to division by zero
    assert result["div_by_zero"].to_list()[2] == 0.25


def test_create_property_column_expressions_bo() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties = ["BO"]
    fluid = InplaceVolumes.Fluid.oil

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid)
    expected_expression = create_named_expression_with_nan_for_inf(pl.col("HCPV") / pl.col("STOIIP"), "BO")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_bg() -> None:
    volume_df_columns = ["HCPV", "GIIP"]
    properties = ["BG"]
    fluid = InplaceVolumes.Fluid.gas

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid)
    expected_expression = create_named_expression_with_nan_for_inf(pl.col("HCPV") / pl.col("GIIP"), "BG")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_ntg() -> None:
    volume_df_columns = ["BULK", "NET"]
    properties = ["NTG"]

    created_expressions = create_property_column_expressions(volume_df_columns, properties)
    expected_expression = create_named_expression_with_nan_for_inf(pl.col("NET") / pl.col("BULK"), "NTG")

    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_poro_and_poro_net() -> None:
    volume_df_columns = ["BULK", "PORV", "NET"]
    properties = ["PORO", "PORO_NET"]

    created_expressions = create_property_column_expressions(volume_df_columns, properties)
    expected_poro_expression = create_named_expression_with_nan_for_inf(pl.col("PORV") / pl.col("BULK"), "PORO")
    expected_poro_net_expression = create_named_expression_with_nan_for_inf(pl.col("PORV") / pl.col("NET"), "PORO_NET")

    assert len(created_expressions) == 2
    assert str(created_expressions[0]) == str(expected_poro_expression)
    assert str(created_expressions[1]) == str(expected_poro_net_expression)


def test_create_property_column_expressions_missing_columns() -> None:
    volume_df_columns = ["HCPV", "PORV"]  # Missing STOIIP for BO
    properties = ["BO", "SW"]
    fluid = InplaceVolumes.Fluid.oil

    created_expressions = create_property_column_expressions(volume_df_columns, properties, fluid)
    expected_expression = create_named_expression_with_nan_for_inf(1 - pl.col("HCPV") / pl.col("PORV"), "SW")
    assert len(created_expressions) == 1
    assert str(created_expressions[0]) == str(expected_expression)


def test_create_property_column_expressions_no_properties() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties: list[str] = []
    fluid = InplaceVolumes.Fluid.oil

    expressions = create_property_column_expressions(volume_df_columns, properties, fluid)
    assert len(expressions) == 0


def test_create_property_column_expressions_no_fluid() -> None:
    volume_df_columns = ["HCPV", "STOIIP"]
    properties = ["BO"]

    expressions = create_property_column_expressions(volume_df_columns, properties)
    assert len(expressions) == 0


def test_create_named_expression_with_nan_for_inf_name_assignment() -> None:
    """Test that the expression is correctly named."""
    df = pl.DataFrame({"a": [1, 2, 3]})
    expr = pl.col("a")
    named_expr = create_named_expression_with_nan_for_inf(expr, "new_name")

    result = df.select(named_expr)

    assert result.columns == ["new_name"]
    assert result["new_name"].to_list() == [1, 2, 3]


def test_create_calculated_volume_column_expressions_no_fluid() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    first_expected_expression = create_named_expression_with_nan_for_inf(
        pl.col("STOIIP") + pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL"
    )
    second_expected_expression = create_named_expression_with_nan_for_inf(
        pl.col("GIIP") + pl.col("ASSOCIATEDGAS"), "GIIP_TOTAL"
    )

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_oil() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(
        volume_df_columns, calculated_volumes, InplaceVolumes.Fluid.oil
    )

    first_expected_expression = create_named_expression_with_nan_for_inf(pl.col("STOIIP"), "STOIIP_TOTAL")
    second_expected_expression = create_named_expression_with_nan_for_inf(pl.col("ASSOCIATEDGAS"), "GIIP_TOTAL")

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_gas() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP", "ASSOCIATEDGAS"]
    calculated_volumes = ["GIIP_TOTAL", "STOIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(
        volume_df_columns, calculated_volumes, InplaceVolumes.Fluid.gas
    )

    first_expected_expression = create_named_expression_with_nan_for_inf(pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL")
    second_expected_expression = create_named_expression_with_nan_for_inf(pl.col("GIIP"), "GIIP_TOTAL")

    assert len(expressions) == 2
    assert str(expressions[0]) == str(first_expected_expression)
    assert str(expressions[1]) == str(second_expected_expression)


def test_create_calculated_volume_column_expressions_missing_columns() -> None:
    volume_df_columns = ["STOIIP"]
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    assert len(expressions) == 0


def test_create_calculated_volume_column_expressions_partial_columns() -> None:
    volume_df_columns = ["STOIIP", "ASSOCIATEDOIL", "GIIP"]  # Missing ASSOCIATEDGAS when fluid is None
    calculated_volumes = ["STOIIP_TOTAL", "GIIP_TOTAL"]
    expressions = create_calculated_volume_column_expressions(volume_df_columns, calculated_volumes)

    expected_expression = create_named_expression_with_nan_for_inf(
        pl.col("STOIIP") + pl.col("ASSOCIATEDOIL"), "STOIIP_TOTAL"
    )

    assert len(expressions) == 1
    assert str(expressions[0]) == str(expected_expression)
