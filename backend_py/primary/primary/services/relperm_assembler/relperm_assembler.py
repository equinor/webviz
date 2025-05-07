from enum import Enum
from typing import List, Callable, Dict, Optional, Sequence
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


class RelPermAssembler:
    def __init__(self, relperm_access: RelPermAccess):
        self._relperm_access = relperm_access

    async def get_relperm_table_info_async(self, relperm_table_name: str):
        single_realization_table = await self._relperm_access.get_single_realization_table_async(relperm_table_name)
        table_columns = single_realization_table.columns
        satnums = extract_satnums_from_relperm_table(single_realization_table)
        all_keywords = extract_keywords_from_relperm_table(single_realization_table)
        family = extract_familiy_info_from_keywords(all_keywords)
        saturation_infos = extract_saturation_axes_from_relperm_table(table_columns, family)

        return RelPermTableInfo(
            table_name=relperm_table_name, saturation_axes=saturation_infos, satnums=sorted(satnums)
        )

    async def get_relperm_realization_data_async(
        self,
        relperm_table_name: str,
        saturation_axis_name: str,
        curve_names: List[str],
        satnum: int,
        realizations: Optional[Sequence[int]],
    ) -> List[RelPermRealizationData]:

        realizations_table: pl.DataFrame = await self._relperm_access.get_relperm_table_async(
            relperm_table_name, realizations
        )

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

        real_data: List[RelPermRealizationData] = []

        for _real, real_table in filtered_table.group_by("REAL"):

            curve_data_arr: List[CurveData] = []
            for curve_name in curve_names:
                curve_values = real_table[curve_name].to_numpy()
                curve_data_arr.append(CurveData(curve_name=curve_name, curve_values=curve_values))

            realization = real_table["REAL"][0]
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
