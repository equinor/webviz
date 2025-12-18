from typing import List
from enum import Enum

import polars as pl
import pyarrow as pa

from .schemas import PvtData


OIL_KEYWORDS = {"PVTO": "Oil (PVTO)", "PVDO": "Dry Oil (PVDO)", "PVCDO": "Dry Oil (PVCDO)"}

GAS_KEYWORDS = {
    "PVTG": "Gas (PVTG)",
    "PVDG": "Gas (PVDG)",
}

WATER_KEYWORDS = {"PVTW": "Water (PVTW)"}


class PHASES(str, Enum):
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"


def pvt_dataframe_to_api_data(pvt_table_pa: pa.Table) -> List[PvtData]:
    """Converts the PVT table from Sumo/Ecl2Df to a list of PvtData objects"""
    # Dataframe manipulation is copied from webviz-subsurface
    dataframe = pl.DataFrame(pvt_table_pa)

    # Make upper case columns map
    uppercase_columns_map = {col: col.upper() for col in dataframe.columns}

    # Rename specific columns
    rename_map = {
        "TYPE": "KEYWORD",
        "RS": "GOR",
        "RSO": "GOR",
        "R": "GOR",
        "RV": "OGR",
    }

    rename_columns_map = {
        **uppercase_columns_map,
        **{k: v for k, v in rename_map.items() if k in uppercase_columns_map.values()},
    }

    # Rename columns to uppercase
    dataframe = dataframe.rename(rename_columns_map)

    # Fill null values with 0
    dataframe = dataframe.fill_null(0.0)

    # Create RATIO column
    if "GOR" in dataframe.columns and "OGR" in dataframe.columns:
        dataframe = dataframe.with_columns((pl.col("GOR") + pl.col("OGR")).alias("RATIO"))
    elif "GOR" in dataframe.columns:
        dataframe = dataframe.with_columns(pl.col("GOR").alias("RATIO"))
    elif "OGR" in dataframe.columns:
        dataframe = dataframe.with_columns(pl.col("OGR").alias("RATIO"))

    if "DENSITY" not in dataframe.columns:
        dataframe = calculate_densities(dataframe)
    if "RATIO" not in dataframe.columns:
        raise ValueError("The dataframe must contain a column for the ratio (OGR, GOR, R, RV, RS).")

    list_of_pvtdata: List[PvtData] = []
    for group_by_columns, df_grouped_on_keyword in dataframe.group_by("KEYWORD", maintain_order=True):
        keyword = group_by_columns[0]
        if keyword in OIL_KEYWORDS:
            phase = PHASES.OIL.value
            name = OIL_KEYWORDS[keyword]
        elif keyword in GAS_KEYWORDS:
            phase = PHASES.GAS.value
            name = GAS_KEYWORDS[keyword]
        elif keyword in WATER_KEYWORDS:
            phase = PHASES.WATER.value
            name = WATER_KEYWORDS[keyword]
        else:
            continue

        for group_by_columns, df_grouped_on_pvtnum in df_grouped_on_keyword.group_by("PVTNUM", maintain_order=True):
            pvtnum = group_by_columns[0]
            pvt_data = PvtData(
                pvtnum=pvtnum,
                name=name,
                phase=phase,
                ratio=df_grouped_on_pvtnum["RATIO"].to_list(),
                pressure=df_grouped_on_pvtnum["PRESSURE"].to_list(),
                volumefactor=df_grouped_on_pvtnum["VOLUMEFACTOR"].to_list(),
                viscosity=df_grouped_on_pvtnum["VISCOSITY"].to_list(),
                density=df_grouped_on_pvtnum["DENSITY"].to_list(),
                pressure_unit=(
                    df_grouped_on_pvtnum["PRESSURE_UNIT"][0]
                    if "PRESSURE_UNIT" in df_grouped_on_pvtnum.columns
                    else "bar"
                ),
                volumefactor_unit=(
                    df_grouped_on_pvtnum["VOLUMEFACTOR_UNIT"][0]
                    if "VOLUMEFACTOR_UNIT" in df_grouped_on_pvtnum.columns
                    else "Rm³/Sm³"
                ),
                viscosity_unit=(
                    df_grouped_on_pvtnum["VISCOSITY_UNIT"][0]
                    if "VISCOSITY_UNIT" in df_grouped_on_pvtnum.columns
                    else "cP"
                ),
                density_unit=(
                    df_grouped_on_pvtnum["DENSITY_UNIT"][0]
                    if "DENSITY_UNIT" in df_grouped_on_pvtnum.columns
                    else "kg/m³"
                ),
                ratio_unit=(
                    df_grouped_on_pvtnum["RATIO_UNIT"][0] if "RATIO_UNIT" in df_grouped_on_pvtnum.columns else "Sm³/Sm³"
                ),
            )
            list_of_pvtdata.append(pvt_data)

    return list_of_pvtdata


def calculate_densities(data_frame: pl.DataFrame) -> pl.DataFrame:
    oil_density = data_frame.filter(pl.col("KEYWORD") == "DENSITY")["OILDENSITY"][0]
    gas_density = data_frame.filter(pl.col("KEYWORD") == "DENSITY")["GASDENSITY"][0]
    water_density = data_frame.filter(pl.col("KEYWORD") == "DENSITY")["WATERDENSITY"][0]

    def calculate_density(keyword: str, ratio: float, volume_factor: float) -> float:
        density = 0.0
        if keyword == "PVTO":
            density = (oil_density + ratio * gas_density) / volume_factor
        elif keyword == "PVDO":
            density = oil_density / volume_factor
        elif keyword == "PVTG":
            density = (gas_density + ratio * oil_density) / volume_factor
        elif keyword == "PVDG":
            density = gas_density / volume_factor
        elif keyword == "PVCDO":
            density = oil_density / volume_factor
        elif keyword == "PVTW":
            density = water_density / volume_factor
        return density

    data_frame = data_frame.with_columns(
        pl.struct(["KEYWORD", "RATIO", "VOLUMEFACTOR"])
        .map_elements(
            lambda row: calculate_density(row["KEYWORD"], row["RATIO"], row["VOLUMEFACTOR"]),
            return_dtype=pl.Float64,
        )
        .alias("DENSITY")
    )
    return data_frame
