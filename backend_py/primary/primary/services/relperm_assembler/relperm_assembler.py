from enum import Enum
from typing import List, Optional, Sequence
import logging
from dataclasses import dataclass
import numpy as np
import polars as pl
from scipy.interpolate import interp1d

from primary.services.sumo_access.relperm_access import RelPermAccess
from primary.services.service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)


LOGGER = logging.getLogger(__name__)


class RelPermFamily(str, Enum):
    """Enumeration of relative permeability keyword families"""

    FAMILY_1 = "family_1"  # SWOF, SGOF, SLGOF family
    FAMILY_2 = "family_2"  # SWFN, SGFN, SOF3 family


RELPERM_FAMILIES = {
    1: ["SWOF", "SGOF", "SLGOF"],
    2: ["SWFN", "SGFN", "SOF3"],
}


@dataclass
class RelPermSaturationAxis:
    saturation_name: str
    relperm_curve_names: List[str]
    capillary_pressure_curve_names: List[str]


@dataclass
class RelPermTableInfo:
    table_name: str
    saturation_axes: List[RelPermSaturationAxis]
    satnums: List[int]


@dataclass
class CurveData:
    curve_name: str
    curve_values: np.ndarray


@dataclass
class RelPermRealizationData:
    curve_data_arr: List[CurveData]
    realization_id: int
    saturation_name: str
    saturation_values: np.ndarray
    saturation_number: int


@dataclass
class StatisticalCurveData:
    curve_name: str
    mean_values: np.ndarray
    min_values: np.ndarray
    max_values: np.ndarray
    p10_values: np.ndarray
    p90_values: np.ndarray


@dataclass
class RelPermStatisticalData:
    saturation_number: int
    saturation_name: str
    saturation_values: np.ndarray
    curve_statistics: List[StatisticalCurveData]


class RelPermAssembler:
    def __init__(self, relperm_access: RelPermAccess):
        self._relperm_access = relperm_access

    async def get_relperm_table_info_async(self, relperm_table_name: str) -> RelPermTableInfo:
        single_realization_table = await self._relperm_access.get_single_realization_table_async(relperm_table_name)
        table_columns = single_realization_table.columns
        satnums = extract_satnums_from_relperm_table(single_realization_table)
        all_keywords = extract_keywords_from_relperm_table(single_realization_table)
        family = extract_familiy_info_from_keywords(all_keywords)
        saturation_infos = extract_saturation_axes_from_relperm_table(table_columns, family)

        return RelPermTableInfo(
            table_name=relperm_table_name, saturation_axes=saturation_infos, satnums=sorted(satnums)
        )

    async def get_relperm_statistical_data_async(
        self,
        relperm_table_name: str,
        saturation_axis_name: str,
        curve_names: List[str],
        satnum: int,
        realizations: Optional[Sequence[int]],
        num_interpolation_points: int = 100,
    ) -> RelPermStatisticalData:
        """
        Fetches and calculates statistical data for relative permeability curves
        for specified realizations, curves, saturation axis, and a single SATNUM.
        If a shared axis is found, statistics are calculated directly.
        Otherwise, data is interpolated onto a common axis before statistics are calculated.
        """

        realizations_table: pl.DataFrame = await self._relperm_access.get_relperm_table_async(
            relperm_table_name, realizations
        )

        if realizations_table.is_empty():
            raise NoDataError(
                f"No data found for table {relperm_table_name} and specified realizations.",
                Service.SUMO,
            )

        table_columns = realizations_table.columns

        if saturation_axis_name not in table_columns:
            raise NoDataError(
                f"Saturation axis {saturation_axis_name} not found in table {relperm_table_name}",
                Service.SUMO,
            )

        # Check if requested curve names exist in the table
        existing_curve_names = [curve_name for curve_name in curve_names if curve_name in table_columns]
        if not existing_curve_names:
            raise NoDataError(
                f"None of the requested curves {curve_names} found in table {relperm_table_name}",
                Service.SUMO,
            )

        # Filter by the single SATNUM and required columns, dropping nulls in relevant columns
        columns_to_use = [saturation_axis_name] + existing_curve_names + ["REAL", "SATNUM"]
        filtered_table = (
            realizations_table.select(columns_to_use)
            .filter(pl.col("SATNUM").cast(pl.Int32) == satnum)
            # Drop rows with nulls in the columns that will be used for interpolation/stats
            .drop_nulls(subset=[saturation_axis_name] + existing_curve_names)
            .sort(saturation_axis_name)
        )

        if filtered_table.is_empty():
            raise NoDataError(
                f"No data found for SATNUM {satnum} in the selected realizations and table {relperm_table_name} after dropping nulls.",
                Service.SUMO,
            )

        unique_realizations_in_filtered_data = filtered_table["REAL"].n_unique()

        # Calculate the number of unique realizations per saturation axis point in the filtered data
        realizations_per_saturation_point = filtered_table.group_by(saturation_axis_name).agg(
            pl.col("REAL").n_unique().alias("real_count")
        )

        # Identify saturation axis points where all unique realizations are present
        shared_saturation_points = realizations_per_saturation_point.filter(
            pl.col("real_count") == unique_realizations_in_filtered_data
        ).select(saturation_axis_name)

        if not shared_saturation_points.is_empty():
            # Case 1: Shared axis found - calculate statistics directly
            LOGGER.info(
                f"Found {shared_saturation_points.shape[0]} shared saturation axis points for SATNUM {satnum} across all realizations."
            )
            # Filter the original filtered_table to include only rows at shared saturation points
            shared_axis_table = filtered_table.join(
                shared_saturation_points,
                on=saturation_axis_name,
                how="inner",  # Use an inner join to keep only shared points
            ).sort(saturation_axis_name)

            statistical_data_result = self._calculate_statistics(
                shared_axis_table,
                saturation_axis_name,
                existing_curve_names,
                satnum,
            )
            return statistical_data_result

        LOGGER.info(
            f"No shared saturation axis points found for SATNUM {satnum} across all realizations. Proceeding with interpolation."
        )
        # Case 2: No shared axis found - perform interpolation

        # Determine common interpolation axis (linearly spaced)
        min_sat = 0.0  # filtered_table[saturation_axis_name].min()
        max_sat = 1.0  # filtered_table[saturation_axis_name].max()

        if not isinstance(min_sat, (int, float)) or not isinstance(max_sat, (int, float)):
            raise InvalidDataError(
                f"Min/max saturation values for axis '{saturation_axis_name}' are not numeric (got {type(min_sat)}, {type(max_sat)}).",
                Service.SUMO,
            )

        if np.isclose(min_sat, max_sat):
            raise InvalidDataError(
                f"Min and max saturation values are the same ({min_sat}). Cannot create interpolation axis.",
                Service.SUMO,
            )

        interpolation_axis = np.linspace(min_sat, max_sat, num_interpolation_points)

        interpolated_data_list = []  # List to hold interpolated dataframes per realization

        # Interpolate data for each realization and curve
        for real_id in filtered_table["REAL"].unique().to_list():
            real_df = filtered_table.filter(pl.col("REAL") == real_id).sort(saturation_axis_name)
            original_sat_values = real_df[saturation_axis_name].to_numpy()

            # Skip realizations with insufficient data points for interpolation
            # Probably not needed...
            if len(original_sat_values) <= 1 or np.all(original_sat_values == original_sat_values[0]):
                LOGGER.warning(
                    f"Skipping interpolation for Realization {real_id}: Insufficient unique saturation points ({len(original_sat_values)})."
                )
                continue

            interpolated_real_data = {"REAL": real_id, saturation_axis_name: interpolation_axis}

            for curve_name in existing_curve_names:
                original_curve_values = real_df[curve_name].to_numpy()

                try:
                    interp_func = interp1d(
                        original_sat_values,
                        original_curve_values,
                        kind="linear",
                        bounds_error=False,
                        fill_value=np.nan,
                    )
                    interpolated_curve_values = interp_func(interpolation_axis)

                except Exception as exc:
                    raise InvalidDataError(
                        f"Interpolation error for Realization {real_id}, Curve {curve_name}: {exc}",
                        Service.SUMO,
                    ) from exc

                # Clamp extrapolated values to the original range min/max if interpolation occurred
                # Should we extrapolate to 0-1?
                if len(original_curve_values) > 0 and not np.all(np.isnan(original_curve_values)):
                    min_original_curve = np.nanmin(original_curve_values)
                    max_original_curve = np.nanmax(original_curve_values)
                    # Only clamp values that are not NaN (results from fill_value=np.nan)
                    non_nan_mask = ~np.isnan(interpolated_curve_values)
                    interpolated_curve_values[non_nan_mask] = np.clip(
                        interpolated_curve_values[non_nan_mask], min_original_curve, max_original_curve
                    )
                else:
                    # If original curve values were all NaN or empty, the interpolated values should also be NaN
                    interpolated_curve_values = np.full_like(interpolation_axis, np.nan)

                interpolated_real_data[curve_name] = interpolated_curve_values

            # Add interpolated data for this realization to the list
            interpolated_data_list.append(pl.DataFrame(interpolated_real_data))

        if not interpolated_data_list:
            raise NoDataError(
                f"No realizations had sufficient data for interpolation for SATNUM {satnum}.",
                Service.SUMO,
            )

        # Combine interpolated data from all realizations into a single DataFrame
        interpolated_table = pl.concat(interpolated_data_list)
        LOGGER.info(f"Shape of combined interpolated table: {interpolated_table.shape}")

        # Calculate statistics on the interpolated data
        # Drop any rows where all curve values are null AFTER interpolation
        # This handles cases where interpolation might have produced NaNs for some points/realizations
        interpolated_table_cleaned = interpolated_table.drop_nulls(subset=existing_curve_names)

        if interpolated_table_cleaned.is_empty():
            raise NoDataError(
                f"Interpolated table is empty after dropping nulls for SATNUM {satnum}. Cannot calculate statistics.",
                Service.SUMO,
            )

        statistical_data_result = self._calculate_statistics(
            interpolated_table_cleaned, saturation_axis_name, existing_curve_names, satnum
        )
        return statistical_data_result

    def _calculate_statistics(
        self,
        data_table: pl.DataFrame,
        saturation_axis_name: str,
        curve_names: List[str],
        satnum: int,
    ) -> RelPermStatisticalData:

        # Calculate statistics by grouping by the saturation axis points
        statistical_results = (
            data_table.group_by(saturation_axis_name)
            .agg(
                [pl.col(curve_name).mean().alias(f"{curve_name}_mean") for curve_name in curve_names]
                + [pl.col(curve_name).min().alias(f"{curve_name}_min") for curve_name in curve_names]
                + [pl.col(curve_name).max().alias(f"{curve_name}_max") for curve_name in curve_names]
                + [
                    pl.col(curve_name).quantile(0.90, interpolation="linear").alias(f"{curve_name}_p10")
                    for curve_name in curve_names
                ]
                + [
                    pl.col(curve_name).quantile(0.10, interpolation="linear").alias(f"{curve_name}_p90")
                    for curve_name in curve_names
                ]
            )
            .sort(saturation_axis_name)
        )

        if statistical_results.is_empty():
            raise NoDataError(
                f"Statistical results are empty after aggregation for SATNUM {satnum}. Cannot calculate statistics.",
                Service.SUMO,
            )

        curve_statistics: List[StatisticalCurveData] = []

        for curve_name in curve_names:
            mean_col = f"{curve_name}_mean"
            min_col = f"{curve_name}_min"
            max_col = f"{curve_name}_max"
            p10_col = f"{curve_name}_p10"
            p90_col = f"{curve_name}_p90"

            # Ensure all expected statistics columns exist for the curve
            if all(col in statistical_results.columns for col in [mean_col, min_col, max_col, p10_col, p90_col]):
                # Check if the mean column for this curve is not all null
                if not statistical_results[mean_col].is_null().all():
                    curve_statistics.append(
                        StatisticalCurveData(
                            curve_name=curve_name,
                            mean_values=statistical_results[mean_col].to_numpy(),
                            min_values=statistical_results[min_col].to_numpy(),
                            max_values=statistical_results[max_col].to_numpy(),
                            p10_values=statistical_results[p10_col].to_numpy(),
                            p90_values=statistical_results[p90_col].to_numpy(),
                        )
                    )

                else:
                    LOGGER.warning(
                        f"Mean values for curve {curve_name} data at SATNUM {satnum} were all null after aggregation. Skipping this curve."
                    )
            else:
                LOGGER.warning(
                    f"Missing one or more statistics columns for curve {curve_name} data. Skipping this curve."
                )

        if not curve_statistics:
            raise NoDataError(
                f"Statistical results are empty after aggregation for SATNUM {satnum}. Cannot calculate statistics.",
                Service.SUMO,
            )

        # Use the saturation axis values from the calculated stats table as the common axis
        if saturation_axis_name in statistical_results.columns:
            saturation_values = statistical_results[saturation_axis_name].to_numpy()
        else:
            raise NoDataError(
                f"Saturation axis column '{saturation_axis_name}' not found in statistical results DataFrame. Cannot return statistical data.",
                Service.SUMO,
            )

        return RelPermStatisticalData(
            saturation_number=satnum,
            saturation_name=saturation_axis_name,
            saturation_values=saturation_values,
            curve_statistics=curve_statistics,
        )

    async def get_relperm_realization_data_async(
        self,
        relperm_table_name: str,
        saturation_axis_name: str,
        curve_names: List[str],
        satnum: int,
        realizations: Optional[Sequence[int]],
    ) -> List[RelPermRealizationData]:
        """
        Fetches realization data for specified curves, saturation axis, and SATNUM.
        Returns a list of RelPermRealizationData, one per realization.
        """
        realizations_table: pl.DataFrame = await self._relperm_access.get_relperm_table_async(
            relperm_table_name, realizations
        )

        table_columns = realizations_table.columns

        if saturation_axis_name not in table_columns:
            raise NoDataError(
                f"Saturation axis {saturation_axis_name} not found in table {relperm_table_name}",
                Service.SUMO,
            )

        for curve_name in curve_names:
            if curve_name not in table_columns:
                raise NoDataError(
                    f"Curve {curve_name} not found in saturation axis {saturation_axis_name} in table {relperm_table_name}",
                    Service.SUMO,
                )

        columns_to_use = [saturation_axis_name] + curve_names + ["REAL", "SATNUM"]
        filtered_table = (
            realizations_table.select(columns_to_use).filter(pl.col("SATNUM").cast(pl.Int32) == satnum).drop_nulls()
        )

        if filtered_table.is_empty():
            raise NoDataError(
                f"No data found for SATNUM {satnum} in the selected realizations and table {relperm_table_name} after filtering.",
                Service.SUMO,
            )

        # Group by realization
        real_data: List[RelPermRealizationData] = []
        for real_table in filtered_table.partition_by("REAL"):
            curve_data_arr = [
                CurveData(curve_name=curve_name, curve_values=real_table[curve_name].to_numpy())
                for curve_name in curve_names
            ]
            realization = real_table["REAL"].unique()[0]
            saturation_values = real_table[saturation_axis_name].to_numpy()
            real_data.append(
                RelPermRealizationData(
                    curve_data_arr=curve_data_arr,
                    saturation_name=saturation_axis_name,
                    saturation_values=saturation_values,
                    realization_id=realization,
                    saturation_number=satnum,
                )
            )

        return real_data


def extract_keywords_from_relperm_table(relperm_table: pl.DataFrame) -> List[str]:
    return relperm_table["KEYWORD"].unique().to_list()


def extract_satnums_from_relperm_table(relperm_table: pl.DataFrame) -> List[int]:
    return relperm_table["SATNUM"].cast(pl.Int32).unique().to_list()


def extract_familiy_info_from_keywords(keywords: List[str]) -> RelPermFamily:

    if any(keyword in RELPERM_FAMILIES[1] for keyword in keywords):
        if any(keyword in RELPERM_FAMILIES[2] for keyword in keywords):
            raise InvalidDataError(
                "Mix of keyword family 1 and 2, currently only support one family at this time.",
                Service.SUMO,
            )
        return RelPermFamily.FAMILY_1

    elif not all(keyword in RELPERM_FAMILIES[2] for keyword in keywords):
        raise InvalidDataError(
            "Unrecognized saturation table keyword in data. This should not occur unless "
            "there has been changes to res2df. Update of this plugin might be required.",
            Service.SUMO,
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
                        curve_name for curve_name in ["KROW", "KRW"] if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in ["PCOW"] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SG" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SG",
                    relperm_curve_names=[
                        curve_name for curve_name in ["KRG", "KROG"] if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in ["PCOG"] if curve_name in relperm_table_columns
                    ],
                )
            )

    if relperm_family == RelPermFamily.FAMILY_2:
        if "SW" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SW",
                    relperm_curve_names=[curve_name for curve_name in ["KRW"] if curve_name in relperm_table_columns],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in ["PCOW"] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SG" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SG",
                    relperm_curve_names=[curve_name for curve_name in ["KRG"] if curve_name in relperm_table_columns],
                    capillary_pressure_curve_names=[
                        curve_name for curve_name in ["PCOG"] if curve_name in relperm_table_columns
                    ],
                )
            )
        if "SO" in relperm_table_columns:
            saturation_infos.append(
                RelPermSaturationAxis(
                    saturation_name="SO",
                    relperm_curve_names=[
                        curve_name for curve_name in ["KROW", "KROG"] if curve_name in relperm_table_columns
                    ],
                    capillary_pressure_curve_names=[],
                )
            )
    return saturation_infos
