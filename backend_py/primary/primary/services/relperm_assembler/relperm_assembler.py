from enum import StrEnum
from typing import List, Callable, Dict
import logging
from dataclasses import dataclass
import numpy as np
from scipy.interpolate import interp1d
import polars as pl
from primary.services.sumo_access.relperm_access import RelPermAccess
from primary.services.service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)

LOGGER = logging.getLogger(__name__)


class RelPermFamily(StrEnum):
    """Enumeration of relative permeability keyword families"""

    FAMILY_1 = "family_1"  # SWOF, SGOF, SLGOF family
    FAMILY_2 = "family_2"  # SWFN, SGFN, SOF3 family


RELPERM_FAMILIES = {
    1: ["SWOF", "SGOF", "SLGOF"],
    2: ["SWFN", "SGFN", "SOF3"],
}


class RelPermCurveNames(StrEnum):
    KRW = "Relative permeability water"
    KRG = "Relative permeability gas"
    KROW = "Relative permeability oil water"
    KROG = "Relative permeability oil gas"
    PCOW = "Capilar pressure oil water"
    PCOG = "Capilar pressure oil gas"


@dataclass
class RelPermSaturationAxis:
    saturation_name: str
    relperm_curve_names: List[RelPermCurveNames]
    capillary_pressure_curve_names: List[str]


@dataclass
class RelPermTableInfo:
    table_name: str
    saturation_axes: List[RelPermSaturationAxis]
    satnums: List[int]


@dataclass
class CurveData:
    curve_name: str
    curve_values: List[float]
    unit: str | None = None


@dataclass
class RelPermRealizationCurveData:
    curve_name: str
    curve_values: np.ndarray
    realization_id: int


class Statistic(StrEnum):
    """
    Definition of possible statistics for a result column in an inplace volumetrics table
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


@dataclass
class RelPermStatisticalCurveData:
    curve_name: str
    curve_values: Dict[Statistic, List[float]]


@dataclass
class RelPermRealizationData:
    saturation_number: int
    saturation_axis_data: CurveData
    relperm_curve_data: List[RelPermRealizationCurveData]


@dataclass
class RelPermStatisticalDataForSaturation:
    saturation_axis_data: CurveData
    saturation_number: int
    relperm_curve_data: List[RelPermStatisticalCurveData]


class RelPermAssembler:
    def __init__(self, relperm_access: RelPermAccess):
        self._relperm_access = relperm_access

    async def get_relperm_table_info(self, relperm_table_name: str):
        single_realization_table = await self._relperm_access.get_single_realization_table(relperm_table_name)
        table_columns = single_realization_table.columns
        satnums = extract_satnums_from_relperm_table(single_realization_table)
        all_keywords = extract_keywords_from_relperm_table(single_realization_table)
        family = extract_familiy_info_from_keywords(all_keywords)
        saturation_infos = extract_saturation_axes_from_relperm_table(table_columns, family)

        return RelPermTableInfo(
            table_name=relperm_table_name, saturation_axes=saturation_infos, satnums=sorted(satnums)
        )

    async def get_relperm_realization_data(
        self, relperm_table_name: str, saturation_axis_name: str, curve_names: List[str], satnum: int
    ) -> RelPermRealizationData:
        realizations_table: pl.DataFrame = await self._relperm_access.get_relperm_table(relperm_table_name)

        table_columns = realizations_table.columns

        if saturation_axis_name not in table_columns:
            raise NoDataError(
                f"Saturation axis {saturation_axis_name} not found in table {relperm_table_name}",
                Service.GENERAL,
            )

        for curve_name in curve_names:
            if curve_name not in table_columns:
                raise NoDataError(
                    f"Curve {curve_name} not found in saturation axis {saturation_axis_name} in table {relperm_table_name}",
                    Service.GENERAL,
                )

        columns_to_use = [saturation_axis_name] + curve_names + ["REAL", "SATNUM"]

        filtered_table = (
            realizations_table.select(columns_to_use)
            .filter((realizations_table["SATNUM"].cast(pl.Int32) == satnum))
            .drop_nulls()
            .sort(saturation_axis_name)
        )
        shared_saturation_axis = np.linspace(0, 1, 50)
        interpolated_realizations_table = interpolate_realizations_satnum_table_on_shared_saturation_axis(
            filtered_table, shared_saturation_axis, saturation_axis_name, curve_names
        )

        real_data: List[RelPermRealizationCurveData] = []

        for _real, real_table in interpolated_realizations_table.group_by("REAL"):

            realization = real_table["REAL"][0]
            for curve_name in curve_names:
                curve_values = real_table[curve_name].to_numpy()
                real_data.append(
                    RelPermRealizationCurveData(
                        curve_name=curve_name, curve_values=curve_values, realization_id=realization
                    )
                )

        return RelPermRealizationData(
            saturation_axis_data=CurveData(
                curve_values=shared_saturation_axis.tolist(),
                curve_name=saturation_axis_name,
            ),
            relperm_curve_data=real_data,
            saturation_number=satnum,
        )

    async def get_relperm_statistics_data(
        self, relperm_table_name: str, saturation_axis_name: str, curve_names: List[str], satnums: List[int]
    ) -> RelPermStatisticalDataForSaturation:
        realizations_table: pl.DataFrame = await self._relperm_access.get_relperm_table(relperm_table_name)
        satnum = satnums[0]
        table_columns = realizations_table.columns

        if saturation_axis_name not in table_columns:
            raise NoDataError(
                f"Saturation axis {saturation_axis_name} not found in table {relperm_table_name}",
                Service.GENERAL,
            )

        for curve_name in curve_names:
            if curve_name not in table_columns:
                raise NoDataError(
                    f"Curve {curve_name} not found in saturation axis {saturation_axis_name} in table {relperm_table_name}",
                    Service.GENERAL,
                )

        columns_to_use = [saturation_axis_name] + curve_names + ["REAL", "SATNUM"]
        filtered_table = (
            realizations_table.select(columns_to_use)
            .filter((realizations_table["SATNUM"].cast(pl.Int32) == satnum))
            .drop_nulls()
            .sort(saturation_axis_name)
        )
        shared_saturation_axis = np.linspace(0, 1, 50)
        interpolated_realizations_table = interpolate_realizations_satnum_table_on_shared_saturation_axis(
            filtered_table, shared_saturation_axis, saturation_axis_name, curve_names
        )
        requested_statistics = [
            Statistic.MEAN,
            Statistic.STD_DEV,
            Statistic.MIN,
            Statistic.MAX,
            Statistic.P10,
            Statistic.P90,
        ]
        statistic_aggregation_expressions = _create_statistic_aggregation_expressions(curve_names, requested_statistics)
        statistical_df = (
            interpolated_realizations_table.select([saturation_axis_name] + curve_names)
            .group_by(saturation_axis_name)
            .agg(statistic_aggregation_expressions)
            .drop_nulls()
            .sort(saturation_axis_name)
        )

        available_statistic_column_names = statistical_df.columns
        statistical_curve_data = []
        for curve_name in curve_names:
            stat_curve_values: Dict[Statistic, List[float]] = {}
            for statistic in requested_statistics:
                statistic_column_name = f"{curve_name}_{statistic}"
                if statistic_column_name not in available_statistic_column_names:
                    raise ValueError(f"Column {statistic_column_name} not found in statistical table")
                curve_values = statistical_df[statistic_column_name].to_list()
                stat_curve_values[statistic] = curve_values
            statistical_curve_data.append(
                RelPermStatisticalCurveData(curve_name=curve_name, curve_values=stat_curve_values)
            )
        return RelPermStatisticalDataForSaturation(
            saturation_axis_data=CurveData(
                curve_values=statistical_df[saturation_axis_name].to_list(),
                curve_name=saturation_axis_name,
            ),
            saturation_number=satnum,
            relperm_curve_data=statistical_curve_data,
        )


def _get_statistical_function_expression(statistic: Statistic) -> Callable[[pl.Expr], pl.Expr] | None:
    """
    Get statistical function Polars expression based on statistic enum

    Note: Inverted P10 and P90 according to oil industry standards
    """
    statistical_function_expression_map: dict[Statistic, Callable[[pl.Expr], pl.Expr]] = {
        Statistic.MEAN: lambda col: col.mean(),
        Statistic.MIN: lambda col: col.min(),
        Statistic.MAX: lambda col: col.max(),
        Statistic.STD_DEV: lambda col: col.std(),
        Statistic.P10: lambda col: col.quantile(0.9, "linear"),  # Inverted P10 and P90
        Statistic.P90: lambda col: col.quantile(0.1, "linear"),  # Inverted P10 and P90
    }

    return statistical_function_expression_map.get(statistic)


def _create_statistical_expression(statistic: Statistic, column_name: str, drop_nans: bool = True) -> pl.Expr:
    """
    Generate the Polars expression for the given statistic.
    """
    base_col = pl.col(column_name)
    if drop_nans:
        base_col = base_col.drop_nans()
    stat_func_expr = _get_statistical_function_expression(statistic)
    if stat_func_expr is None:
        raise ValueError(f"Unsupported statistic: {statistic}")
    return stat_func_expr(base_col).alias(f"{column_name}_{statistic}")


def _create_statistic_aggregation_expressions(
    result_columns: list[str], statistics: list[Statistic], drop_nans: bool = True
) -> list[pl.Expr]:
    """
    Create Polars expressions for aggregation of result columns
    """
    expressions = []
    for column_name in result_columns:
        for statistic in statistics:
            expressions.append(_create_statistical_expression(statistic, column_name, drop_nans))
    return expressions


def interpolate_curve_values_to_shared_axis(
    original_axis_values: np.ndarray, original_curve_values: np.ndarray, shared_axis_values: np.ndarray
) -> np.ndarray:
    interpolator = interp1d(
        original_axis_values,
        original_curve_values,
        kind="cubic",
        bounds_error=False,
        fill_value=[original_curve_values[0], original_curve_values[-1]],
    )

    interpolated_values = interpolator(shared_axis_values)
    return interpolated_values


def extract_keywords_from_relperm_table(relperm_table: pl.DataFrame) -> List[str]:
    return relperm_table["KEYWORD"].unique().to_list()


def extract_satnums_from_relperm_table(relperm_table: pl.DataFrame) -> List[int]:
    return relperm_table["SATNUM"].cast(pl.Int32).unique().to_list()


def extract_familiy_info_from_keywords(keywords: List[str]) -> RelPermFamily:

    if any(keyword in RELPERM_FAMILIES[1] for keyword in keywords):
        if any(keyword in RELPERM_FAMILIES[2] for keyword in keywords):
            raise InvalidDataError(
                "Mix of keyword family 1 and 2, currently only support one family at this time.",
                Service.GENERAL,
            )
        return RelPermFamily.FAMILY_1

    elif not all(keyword in RELPERM_FAMILIES[2] for keyword in keywords):
        raise InvalidDataError(
            "Unrecognized saturation table keyword in data. This should not occur unless "
            "there has been changes to res2df. Update of this plugin might be required.",
            Service.GENERAL,
        )
    else:
        return RelPermFamily.FAMILY_2


def extract_saturation_axes_from_relperm_table(
    relperm_table_columns: List[str], relperm_family: RelPermFamily
) -> List[RelPermSaturationAxis]:
    saturation_infos = []
    if relperm_family == RelPermFamily.FAMILY_1:
        if "SW" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SW",
                    relperm_curve_names=[
                        curve_name
                        for curve_name in [RelPermCurveNames.KROW, RelPermCurveNames.KRW]
                        if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.PCOW] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SG" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SG",
                    relperm_curve_names=[
                        curve_name
                        for curve_name in [RelPermCurveNames.KRG, RelPermCurveNames.KROG]
                        if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.PCOG] if curve_name in relperm_table_columns
                    ],
                )
            )

    if relperm_family == RelPermFamily.FAMILY_2:
        if "SW" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SW",
                    relperm_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.KRW] if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.PCOW] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SG" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SG",
                    relperm_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.KRG] if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in [RelPermCurveNames.PCOG] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SO" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SO",
                    relperm_curve_names=[
                        curve_name
                        for curve_name in [RelPermCurveNames.KROW, RelPermCurveNames.KROG]
                        if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[],
                )
            )
    return saturation_infos


def interpolate_realizations_satnum_table_on_shared_saturation_axis(
    satnum_table: pl.DataFrame, shared_saturation_axis: np.ndarray, saturation_axis_name: str, curve_names: List[str]
) -> pl.DataFrame:
    shared_saturation_axis = np.linspace(0, 1, 50)
    interpolated_tables = []
    for _real, real_table in satnum_table.group_by("REAL"):
        realization = real_table["REAL"][0]

        # Sort by saturation
        real_table_sorted = real_table.sort(saturation_axis_name)
        original_saturation = real_table_sorted[saturation_axis_name].to_numpy()

        interpolated_realization_table = pl.DataFrame()

        # Ensure shared_saturation_axis is within bounds of original data
        valid_mask = (shared_saturation_axis >= np.min(original_saturation)) & (
            shared_saturation_axis <= np.max(original_saturation)
        )
        shared_saturation_filtered = shared_saturation_axis[valid_mask]

        # Interpolate each curve
        for curve_name in curve_names:
            original_values = real_table_sorted[curve_name].to_numpy()

            # Determine if values should be non-negative
            is_non_negative = all(original_values >= 0)

            # Create interpolator with appropriate bounds handling
            interpolator = interp1d(
                original_saturation,
                original_values,
                kind="cubic",
                bounds_error=False,
                fill_value=(original_values[0], original_values[-1]),  # Use endpoint values instead of NaN
            )

            # Interpolate to shared axis
            interpolated_values = interpolator(shared_saturation_filtered)

            # Enforce non-negativity if original data was non-negative
            if is_non_negative:
                interpolated_values = np.maximum(interpolated_values, 0)

            # Create full-length array with NaN padding
            full_interpolated = np.full_like(shared_saturation_axis, np.nan)
            full_interpolated[valid_mask] = interpolated_values

            # Add to table
            interpolated_realization_table = interpolated_realization_table.with_columns(
                **{curve_name: pl.Series(full_interpolated)}
            )

        # Add saturation axis and realization number
        interpolated_realization_table = interpolated_realization_table.with_columns(
            **{
                saturation_axis_name: pl.Series(shared_saturation_axis),
                "REAL": pl.Series([realization] * len(shared_saturation_axis)),
            }
        )

        interpolated_tables.append(interpolated_realization_table)

    # Concatenate all realizations
    return pl.concat(interpolated_tables)
