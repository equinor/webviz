import logging
import math
from bisect import bisect_left
from enum import Enum
from typing import Sequence, cast

import polars as pl
import pyarrow as pa
import pyarrow.compute as pc
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_core_utils.perf_metrics import PerfMetrics

from webviz_services.service_exceptions import InvalidDataError, NoDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .relperm_types import (
    RelpermCurveData,
    RelpermRealizationData,
    RelpermSaturationAxis,
    RelpermTableDefinition,
)
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)

SATURATION_NAMES = ["SW", "SO", "SG", "SL"]
RELPERM_FAMILY_1_KEYWORDS = ["SWOF", "SGOF", "SLGOF"]
RELPERM_FAMILY_2_KEYWORDS = ["SWFN", "SGFN", "SOF3"]
REQUIRED_METADATA_COLUMNS = ["KEYWORD", "SATNUM"]


class RelpermFamily(str, Enum):
    FAMILY_1 = "family_1"
    FAMILY_2 = "family_2"


class RelpermAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "RelpermAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_table_names_async(self) -> list[str]:
        table_context = self._ensemble_context.tables.filter(standard_result=StandardResultName.relperm)
        table_names = await table_context.names_async
        if not table_names:
            raise NoDataError(
                f"No relperm tables found for case={self._case_uuid}, ensemble={self._ensemble_name}", Service.SUMO
            )
        return sorted(table_names)

    async def get_table_definition_async(self, table_name: str) -> RelpermTableDefinition:
        timer = PerfMetrics()
        realizations = await self._get_realizations_for_table_async(table_name)
        timer.record_lap("get-realizations")

        if not realizations:
            raise NoDataError(
                f"No realizations found for relperm table {table_name}, case={self._case_uuid}, ensemble={self._ensemble_name}",
                Service.SUMO,
            )

        single_realization_table = await self._get_single_realization_table_async(table_name, realizations[0])
        dataframe = normalize_relperm_table(cast(pl.DataFrame, pl.from_arrow(single_realization_table)))
        timer.record_lap("load-single-realization")

        table_definition = create_relperm_table_definition(table_name, dataframe, realizations)
        timer.record_lap("create-table-definition")

        LOGGER.debug(
            f"get_table_definition_async took: {timer.to_string()}, {self._case_uuid=}, {self._ensemble_name=}, {table_name=}"
        )
        return table_definition

    async def get_realization_data_async(
        self,
        table_name: str,
        saturation_axis_name: str,
        curve_names: Sequence[str],
        satnums: Sequence[int],
        realizations: Sequence[int] | None,
    ) -> list[RelpermRealizationData]:
        timer = PerfMetrics()
        if len(curve_names) == 0:
            raise InvalidDataError("At least one relperm curve name must be requested", Service.SUMO)
        if len(satnums) == 0:
            raise InvalidDataError("At least one SATNUM must be requested", Service.SUMO)

        available_realizations = await self._get_realizations_for_table_async(table_name)
        if not available_realizations:
            raise NoDataError(
                f"No realizations found for relperm table {table_name}, case={self._case_uuid}, ensemble={self._ensemble_name}",
                Service.SUMO,
            )
        timer.record_lap("get-realizations")

        requested_realizations = sorted(set(realizations)) if realizations is not None else available_realizations
        unknown_realizations = sorted(set(requested_realizations) - set(available_realizations))
        if unknown_realizations:
            raise InvalidDataError(
                f"Requested realizations not found for relperm table {table_name}: {unknown_realizations}", Service.SUMO
            )

        column_names = await self._get_column_names_async(table_name)
        normalized_column_names = normalize_column_names(column_names)
        requested_columns = get_required_columns_for_realization_data(
            normalized_column_names, saturation_axis_name, curve_names
        )
        timer.record_lap("validate-columns")

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.relperm)
        table_loader.require_table_name(table_name)
        arrow_table = await table_loader.get_aggregated_multiple_columns_async(requested_columns)
        timer.record_lap("load-aggregated-table")

        arrow_table = _filter_arrow_table_on_realizations(arrow_table, requested_realizations)
        dataframe = normalize_relperm_table(cast(pl.DataFrame, pl.from_arrow(arrow_table)))
        ret_arr = create_relperm_realization_data(dataframe, saturation_axis_name, curve_names, satnums)
        timer.record_lap("shape-realization-data")

        LOGGER.debug(
            f"get_realization_data_async took: {timer.to_string()}, {self._case_uuid=}, {self._ensemble_name=}, {table_name=}, {saturation_axis_name=}, {curve_names=}, {satnums=}, {requested_realizations=}"
        )
        return ret_arr

    async def _get_column_names_async(self, table_name: str) -> list[str]:
        table_context = self._ensemble_context.tables.filter(
            name=table_name, standard_result=StandardResultName.relperm
        )
        column_names = await table_context.columns_async
        if not column_names:
            raise NoDataError(
                f"No columns found for relperm table {table_name}, case={self._case_uuid}, ensemble={self._ensemble_name}",
                Service.SUMO,
            )
        return cast(list[str], column_names)

    async def _get_realizations_for_table_async(self, table_name: str) -> list[int]:
        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            standard_result=StandardResultName.relperm,
            realization=True,
            aggregation=False,
        )
        realizations = await table_context.realizationids_async
        return sorted(cast(list[int], realizations))

    async def _get_single_realization_table_async(self, table_name: str, realization: int) -> pa.Table:
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.relperm)
        table_loader.require_table_name(table_name)
        return await table_loader.get_single_realization_async(realization)


def normalize_column_names(column_names: Sequence[str]) -> list[str]:
    return [column_name.upper() for column_name in column_names]


def normalize_relperm_table(dataframe: pl.DataFrame) -> pl.DataFrame:
    """Normalize Sumo relperm tables to the column names expected by the service layer."""
    rename_map = {column_name: column_name.upper() for column_name in dataframe.columns}
    dataframe = dataframe.rename(rename_map)
    if "TYPE" in dataframe.columns and "KEYWORD" not in dataframe.columns:
        dataframe = dataframe.rename({"TYPE": "KEYWORD"})
    return dataframe


def create_relperm_table_definition(
    table_name: str, dataframe: pl.DataFrame, realizations: Sequence[int]
) -> RelpermTableDefinition:
    """Inspect one realization table and expose the table-wide RelPerm options available to the frontend."""
    validate_required_relperm_columns(dataframe.columns)
    keywords = extract_keywords(dataframe)
    relperm_family = extract_relperm_family(keywords)
    saturation_axes = extract_saturation_axes(dataframe.columns, relperm_family)
    satnums = extract_satnums(dataframe)

    return RelpermTableDefinition(
        table_name=table_name,
        saturation_axes=saturation_axes,
        satnums=satnums,
        realizations=sorted(set(realizations)),
    )


def validate_required_relperm_columns(column_names: Sequence[str]) -> None:
    column_name_set = set(column_names)
    missing_column_names = [
        column_name for column_name in REQUIRED_METADATA_COLUMNS if column_name not in column_name_set
    ]
    if missing_column_names:
        raise InvalidDataError(f"Missing required relperm columns: {missing_column_names}", Service.SUMO)

    if not any(saturation_name in column_name_set for saturation_name in SATURATION_NAMES):
        raise InvalidDataError(f"Missing saturation column. Expected one of: {SATURATION_NAMES}", Service.SUMO)


def extract_keywords(dataframe: pl.DataFrame) -> list[str]:
    if "KEYWORD" not in dataframe.columns:
        raise InvalidDataError("Missing required relperm column: KEYWORD", Service.SUMO)
    return sorted(str(keyword).upper() for keyword in dataframe["KEYWORD"].drop_nulls().unique().to_list())


def extract_satnums(dataframe: pl.DataFrame) -> list[int]:
    if "SATNUM" not in dataframe.columns:
        raise InvalidDataError("Missing required relperm column: SATNUM", Service.SUMO)
    return sorted(int(satnum) for satnum in dataframe["SATNUM"].drop_nulls().unique().to_list())


def extract_relperm_family(keywords: Sequence[str]) -> RelpermFamily:
    """Classify supported Eclipse relperm table families and reject ambiguous keyword mixes."""
    has_family_1 = any(keyword in RELPERM_FAMILY_1_KEYWORDS for keyword in keywords)
    has_family_2 = any(keyword in RELPERM_FAMILY_2_KEYWORDS for keyword in keywords)

    if has_family_1 and has_family_2:
        raise InvalidDataError("Mix of relperm keyword family 1 and 2 is not supported", Service.SUMO)

    if has_family_1:
        if "SGOF" in keywords and "SLGOF" in keywords:
            raise InvalidDataError("Mix of SGOF and SLGOF relperm keywords is not supported", Service.SUMO)
        return RelpermFamily.FAMILY_1

    if has_family_2 and all(keyword in RELPERM_FAMILY_2_KEYWORDS for keyword in keywords):
        return RelpermFamily.FAMILY_2

    raise InvalidDataError(f"Unrecognized relperm keywords: {list(keywords)}", Service.SUMO)


def extract_saturation_axes(column_names: Sequence[str], relperm_family: RelpermFamily) -> list[RelpermSaturationAxis]:
    """Map supported saturation columns to the curve columns that can be plotted against them."""
    column_name_set = set(column_names)
    saturation_axes: list[RelpermSaturationAxis] = []

    if relperm_family == RelpermFamily.FAMILY_1:
        saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SW", ["KRW", "KROW"], ["PCOW"]))
        saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SG", ["KRG", "KROG"], ["PCOG"]))
        saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SL", ["KRG", "KROG"], ["PCOG"]))
        return saturation_axes

    saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SW", ["KRW"], ["PCOW"]))
    saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SG", ["KRG"], ["PCOG"]))
    saturation_axes.extend(_make_saturation_axis_if_present(column_name_set, "SO", ["KROW", "KROG"], []))
    return saturation_axes


def get_required_columns_for_realization_data(
    available_column_names: Sequence[str], saturation_axis_name: str, curve_names: Sequence[str]
) -> list[str]:
    """Return the normalized Sumo columns needed to fetch realization data for the selected curves."""
    available_column_name_set = set(available_column_names)
    selected_column_names = unique_preserve_order(
        [saturation_axis_name.upper(), *[curve_name.upper() for curve_name in curve_names]]
    )
    missing_column_names = [
        column_name for column_name in selected_column_names if column_name not in available_column_name_set
    ]

    if missing_column_names:
        raise InvalidDataError(f"Missing requested relperm columns: {missing_column_names}", Service.SUMO)

    return selected_column_names


def unique_preserve_order(values: Sequence[str]) -> list[str]:
    return list(dict.fromkeys(values))


def create_relperm_realization_data(
    dataframe: pl.DataFrame,
    saturation_axis_name: str,
    curve_names: Sequence[str],
    satnums: Sequence[int],
) -> list[RelpermRealizationData]:
    """Shape aggregated Sumo rows into realization curves on one shared saturation grid per SATNUM.

    Curves for different realizations often have different saturation sampling. The returned data is interpolated onto
    the union of samples inside the common saturation interval for each SATNUM, making fancharts and data channels
    compare realization values at the same saturation points.
    """
    saturation_axis_name = saturation_axis_name.upper()
    curve_names = unique_preserve_order([curve_name.upper() for curve_name in curve_names])
    selected_satnums = sorted(set(satnums))
    required_columns = ["REAL", "SATNUM", saturation_axis_name, *curve_names]
    missing_column_names = [column_name for column_name in required_columns if column_name not in dataframe.columns]
    if missing_column_names:
        raise InvalidDataError(f"Missing relperm data columns: {missing_column_names}", Service.SUMO)

    filtered_dataframe = (
        dataframe.select(required_columns)
        .filter(pl.col("SATNUM").cast(pl.Int64).is_in(selected_satnums))
        .drop_nulls(subset=[saturation_axis_name, *curve_names])
        .sort(["REAL", "SATNUM", saturation_axis_name])
    )

    if filtered_dataframe.is_empty():
        raise NoDataError(f"No relperm data found for SATNUMs {selected_satnums}", Service.SUMO)

    partitions = filtered_dataframe.partition_by(["REAL", "SATNUM"], maintain_order=True)
    shared_saturation_values_by_satnum = create_shared_saturation_values_by_satnum(partitions, saturation_axis_name)

    ret_arr: list[RelpermRealizationData] = []
    for partition in partitions:
        realization = int(partition["REAL"][0])
        satnum = int(partition["SATNUM"][0])
        source_saturation_values = partition[saturation_axis_name].to_list()
        validate_saturation_values(source_saturation_values, realization, satnum, saturation_axis_name)
        target_saturation_values = shared_saturation_values_by_satnum[satnum]
        curve_data = [
            RelpermCurveData(
                curve_name=curve_name,
                curve_values=interpolate_curve_values(
                    source_saturation_values,
                    get_valid_curve_values(partition, curve_name, realization, satnum),
                    target_saturation_values,
                ),
            )
            for curve_name in curve_names
        ]
        ret_arr.append(
            RelpermRealizationData(
                realization=realization,
                satnum=satnum,
                saturation_name=saturation_axis_name,
                saturation_values=target_saturation_values,
                curve_data=curve_data,
            )
        )

    return ret_arr


def validate_saturation_values(
    saturation_values: Sequence[float], realization: int, satnum: int, saturation_axis_name: str
) -> None:
    """Reject saturation axes that would make interpolation ambiguous or numerically invalid."""
    if any(not math.isfinite(float(value)) for value in saturation_values):
        raise InvalidDataError(
            f"Non-finite saturation values found for realization={realization}, SATNUM={satnum}, saturation_axis={saturation_axis_name}",
            Service.SUMO,
        )

    if len(set(saturation_values)) != len(saturation_values):
        raise InvalidDataError(
            f"Duplicate saturation values found for realization={realization}, SATNUM={satnum}, saturation_axis={saturation_axis_name}",
            Service.SUMO,
        )


def get_valid_curve_values(partition: pl.DataFrame, curve_name: str, realization: int, satnum: int) -> list[float]:
    """Return curve values for one realization/SATNUM partition after rejecting non-finite values."""
    curve_values = partition[curve_name].to_list()
    if any(not math.isfinite(float(value)) for value in curve_values):
        raise InvalidDataError(
            f"Non-finite curve values found for realization={realization}, SATNUM={satnum}, curve={curve_name}",
            Service.SUMO,
        )
    return curve_values


def create_shared_saturation_values_by_satnum(
    partitions: Sequence[pl.DataFrame], saturation_axis_name: str
) -> dict[int, list[float]]:
    """Build a common interpolation target grid for each SATNUM.

    The grid uses all observed saturation samples that fall inside the overlap between selected realizations. Values
    outside the overlap are intentionally excluded to avoid extrapolating curves beyond their sampled range.
    """
    saturation_values_by_satnum: dict[int, list[list[float]]] = {}

    for partition in partitions:
        satnum = int(partition["SATNUM"][0])
        saturation_values_by_satnum.setdefault(satnum, []).append(partition[saturation_axis_name].to_list())

    shared_saturation_values_by_satnum: dict[int, list[float]] = {}
    for satnum, saturation_values_arr in saturation_values_by_satnum.items():
        min_common_saturation = max(min(saturation_values) for saturation_values in saturation_values_arr)
        max_common_saturation = min(max(saturation_values) for saturation_values in saturation_values_arr)
        shared_saturation_values = sorted(
            {
                value
                for saturation_values in saturation_values_arr
                for value in saturation_values
                if min_common_saturation <= value <= max_common_saturation
            }
        )
        if not shared_saturation_values:
            raise NoDataError(f"No common saturation interval found for SATNUM {satnum}", Service.SUMO)
        shared_saturation_values_by_satnum[satnum] = shared_saturation_values

    return shared_saturation_values_by_satnum


def interpolate_curve_values(
    source_saturation_values: Sequence[float],
    source_curve_values: Sequence[float],
    target_saturation_values: Sequence[float],
) -> list[float]:
    """Interpolate one curve onto the target saturation grid using sorted source samples."""
    source_points = sorted(zip(source_saturation_values, source_curve_values, strict=True))
    source_saturation_values = [point[0] for point in source_points]
    source_curve_values = [point[1] for point in source_points]

    return [
        interpolate_single_value(source_saturation_values, source_curve_values, target_saturation_value)
        for target_saturation_value in target_saturation_values
    ]


def interpolate_single_value(
    source_saturation_values: Sequence[float],
    source_curve_values: Sequence[float],
    target_saturation_value: float,
) -> float:
    """Linearly interpolate one curve value, clamping only for defensive out-of-range calls."""
    insertion_index = bisect_left(source_saturation_values, target_saturation_value)
    if (
        insertion_index < len(source_saturation_values)
        and source_saturation_values[insertion_index] == target_saturation_value
    ):
        return float(source_curve_values[insertion_index])

    if insertion_index == 0:
        return float(source_curve_values[0])
    if insertion_index >= len(source_saturation_values):
        return float(source_curve_values[-1])

    lower_saturation_value = source_saturation_values[insertion_index - 1]
    upper_saturation_value = source_saturation_values[insertion_index]
    lower_curve_value = source_curve_values[insertion_index - 1]
    upper_curve_value = source_curve_values[insertion_index]
    interpolation_fraction = (target_saturation_value - lower_saturation_value) / (
        upper_saturation_value - lower_saturation_value
    )

    return float(lower_curve_value + interpolation_fraction * (upper_curve_value - lower_curve_value))


def _make_saturation_axis_if_present(
    column_name_set: set[str],
    saturation_name: str,
    relperm_curve_names: Sequence[str],
    capillary_pressure_curve_names: Sequence[str],
) -> list[RelpermSaturationAxis]:
    if saturation_name not in column_name_set:
        return []

    return [
        RelpermSaturationAxis(
            saturation_name=saturation_name,
            relperm_curve_names=[curve_name for curve_name in relperm_curve_names if curve_name in column_name_set],
            capillary_pressure_curve_names=[
                curve_name for curve_name in capillary_pressure_curve_names if curve_name in column_name_set
            ],
        )
    ]


def _filter_arrow_table_on_realizations(arrow_table: pa.Table, realizations: Sequence[int]) -> pa.Table:
    if "REAL" not in arrow_table.column_names:
        raise InvalidDataError("Missing REAL column in aggregated relperm table", Service.SUMO)
    realization_mask = pc.is_in(arrow_table["REAL"], value_set=pa.array(realizations))
    return arrow_table.filter(realization_mask)
