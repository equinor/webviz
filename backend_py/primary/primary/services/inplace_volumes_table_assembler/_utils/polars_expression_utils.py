import numpy as np
import polars as pl

from primary.services.sumo_access.inplace_volumes_table_types import (
    CalculatedVolume,
    Property,
    InplaceVolumes,
)

"""
This file contains general utility functions for polars DataFrame utils
"""


def create_named_expression_with_nan_for_inf(expr: pl.Expr, name: str) -> pl.Expr:
    """
    Replace inf values with nan in a Polars expression and assign a new name

    returns: New expression with inf values replaced with nan and assigned a new name
    """
    return pl.when(expr.is_infinite()).then(np.nan).otherwise(expr).alias(name)


def create_property_column_expressions(
    volumes_df_columns: list[str], properties: list[str], fluid: InplaceVolumes.Fluid | None = None
) -> list[pl.Expr]:
    """
    Create Polars expressions for property columns base available volume columns.

    If one of the volume names needed for a property is not found, the property expressions is not provided

    Args:
    - volume_df_columns (list[str]): list of column names of volume pl.Dataframe
    - properties (list[str]): Name of the properties to calculate

    Returns:
    - list[pl.Expr]: list of Polars expressions for property columns

    """
    calculated_property_expressions: list[pl.Expr] = []

    # Alias for InplaceVolumes.VolumetricColumns
    VolumeColumns = InplaceVolumes.VolumetricColumns

    # If one of the volume names needed for a property is not found, the property array is not calculated
    if (
        Property.BO in properties
        and fluid == InplaceVolumes.Fluid.oil
        and set([VolumeColumns.HCPV, VolumeColumns.STOIIP]).issubset(volumes_df_columns)
    ):
        expression = pl.col(VolumeColumns.HCPV.value) / pl.col(VolumeColumns.STOIIP.value)
        calculated_property_expressions.append(create_named_expression_with_nan_for_inf(expression, Property.BO.value))

    if (
        Property.BG in properties
        and fluid == InplaceVolumes.Fluid.gas
        and set([VolumeColumns.HCPV, VolumeColumns.GIIP]).issubset(volumes_df_columns)
    ):
        expression = pl.col(VolumeColumns.HCPV.value) / pl.col(VolumeColumns.GIIP.value)
        calculated_property_expressions.append(create_named_expression_with_nan_for_inf(expression, Property.BG.value))

    if Property.NTG in properties and set([VolumeColumns.BULK, VolumeColumns.NET]).issubset(volumes_df_columns):
        ntg_expression = pl.col(VolumeColumns.NET.value) / pl.col(VolumeColumns.BULK.value)
        calculated_property_expressions.append(
            create_named_expression_with_nan_for_inf(ntg_expression, Property.NTG.value)
        )

    if Property.PORO in properties and set([VolumeColumns.BULK, VolumeColumns.PORV]).issubset(volumes_df_columns):
        poro_expression = pl.col(VolumeColumns.PORV.value) / pl.col(VolumeColumns.BULK.value)
        calculated_property_expressions.append(
            create_named_expression_with_nan_for_inf(poro_expression, Property.PORO.value)
        )

    if Property.PORO_NET in properties and set([VolumeColumns.PORV, VolumeColumns.NET]).issubset(volumes_df_columns):
        poro_net_expression = pl.col(VolumeColumns.PORV.value) / pl.col(VolumeColumns.NET.value)
        calculated_property_expressions.append(
            create_named_expression_with_nan_for_inf(poro_net_expression, Property.PORO_NET.value)
        )

    if Property.SW in properties and set([VolumeColumns.HCPV, VolumeColumns.PORV]).issubset(volumes_df_columns):
        # NOTE: HCPV/PORV = 0/0 = Nan -> 1 - Nan = Nan, if HCPV = 0 and PORV = 0 -> SW = 1 it must be handled
        sw_expression = 1 - pl.col(VolumeColumns.HCPV.value) / pl.col(VolumeColumns.PORV.value)
        calculated_property_expressions.append(
            create_named_expression_with_nan_for_inf(sw_expression, Property.SW.value)
        )

    return calculated_property_expressions


def create_calculated_volume_column_expressions(
    volumes_df_columns: list[str], calculated_volumes: list[str], fluid: InplaceVolumes.Fluid | None = None
) -> list[pl.Expr]:
    """
    Create Polars expressions for calculated volume columns base available volume columns.

    Args:
    - volumes_df_columns (list[str]): list of column names of volumes pl.DataFrame
    - calculated_volumes (list[str]): Name of the volume column to calculate

    Returns:
    - list[pl.Expr]: list of Polars expressions for calculated volume columns

    """
    calculated_volume_expressions: list[pl.Expr] = []

    VolumeColumns = InplaceVolumes.VolumetricColumns

    # Handle STOIIP_TOTAL and GIIP_TOTAL
    if CalculatedVolume.STOIIP_TOTAL in calculated_volumes:
        stoiip_total_expression: pl.Expr | None = None
        if fluid is None and set([VolumeColumns.STOIIP, VolumeColumns.ASSOCIATEDOIL]).issubset(volumes_df_columns):
            stoiip_total_expression = pl.col(VolumeColumns.STOIIP.value) + pl.col(VolumeColumns.ASSOCIATEDOIL.value)
        if fluid == InplaceVolumes.Fluid.oil and VolumeColumns.STOIIP in volumes_df_columns:
            stoiip_total_expression = pl.col(VolumeColumns.STOIIP.value)
        if fluid == InplaceVolumes.Fluid.gas and VolumeColumns.ASSOCIATEDOIL in volumes_df_columns:
            stoiip_total_expression = pl.col(VolumeColumns.ASSOCIATEDOIL.value)
        if stoiip_total_expression is not None:
            calculated_volume_expressions.append(
                create_named_expression_with_nan_for_inf(stoiip_total_expression, CalculatedVolume.STOIIP_TOTAL.value)
            )
    if CalculatedVolume.GIIP_TOTAL in calculated_volumes:
        giip_total_expression: pl.Expr | None = None
        if fluid is None and set([VolumeColumns.GIIP, VolumeColumns.ASSOCIATEDGAS]).issubset(volumes_df_columns):
            giip_total_expression = pl.col(VolumeColumns.GIIP.value) + pl.col(VolumeColumns.ASSOCIATEDGAS.value)
        if fluid == InplaceVolumes.Fluid.gas and VolumeColumns.GIIP in volumes_df_columns:
            giip_total_expression = pl.col(VolumeColumns.GIIP.value)
        if fluid == InplaceVolumes.Fluid.oil and VolumeColumns.ASSOCIATEDGAS in volumes_df_columns:
            giip_total_expression = pl.col(VolumeColumns.ASSOCIATEDGAS.value)
        if giip_total_expression is not None:
            calculated_volume_expressions.append(
                create_named_expression_with_nan_for_inf(giip_total_expression, "GIIP_TOTAL")
            )

    return calculated_volume_expressions
