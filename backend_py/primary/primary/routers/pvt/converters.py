from typing import List
from enum import Enum

import pandas as pd

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


def pvt_dataframe_to_api_data(data_frame: pd.DataFrame) -> List[PvtData]:
    """Converts the PVT table from Sumo/Ecl2Df to a list of PvtData objects"""
    # Dataframe manipulation is copied from webviz-subsurface

    data_frame = data_frame.rename(str.upper, axis="columns").rename(
        columns={
            "TYPE": "KEYWORD",
            "RS": "GOR",
            "RSO": "GOR",
            "R": "GOR",
            "RV": "OGR",
        }
    )
    data_frame = data_frame.fillna(0)
    if "GOR" in data_frame.columns and "OGR" in data_frame.columns:
        data_frame["RATIO"] = data_frame["GOR"] + data_frame["OGR"]
    elif "GOR" in data_frame.columns:
        data_frame["RATIO"] = data_frame["GOR"]
    elif "OGR" in data_frame.columns:
        data_frame["RATIO"] = data_frame["OGR"]

    if not "DENSITY" in data_frame.columns:
        data_frame = calculate_densities(data_frame)
    if not "RATIO" in data_frame.columns:
        raise ValueError("The dataframe must contain a column for the ratio (OGR, GOR, R, RV, RS).")

    list_of_pvtdata: List[PvtData] = []

    for keyword, df_grouped_on_keyword in data_frame.groupby("KEYWORD"):
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
        for pvtnum, df_grouped_on_pvtnum in df_grouped_on_keyword.groupby("PVTNUM"):
            pvt_data = PvtData(
                pvtnum=pvtnum,
                name=name,
                phase=phase,
                ratio=df_grouped_on_pvtnum["RATIO"].tolist(),
                pressure=df_grouped_on_pvtnum["PRESSURE"].tolist(),
                volumefactor=df_grouped_on_pvtnum["VOLUMEFACTOR"].tolist(),
                viscosity=df_grouped_on_pvtnum["VISCOSITY"].tolist(),
                density=df_grouped_on_pvtnum["DENSITY"].tolist(),
                pressure_unit=df_grouped_on_pvtnum["PRESSURE_UNIT"].iloc[0]
                if "PRESSURE_UNIT" in df_grouped_on_pvtnum.columns
                else "bar",
                volumefactor_unit=df_grouped_on_pvtnum["VOLUMEFACTOR_UNIT"].iloc[0]
                if "VOLUMEFACTOR_UNIT" in df_grouped_on_pvtnum.columns
                else "Rm³/Sm³",
                viscosity_unit=df_grouped_on_pvtnum["VISCOSITY_UNIT"].iloc[0]
                if "VISCOSITY_UNIT" in df_grouped_on_pvtnum.columns
                else "cP",
                density_unit=df_grouped_on_pvtnum["DENSITY_UNIT"].iloc[0]
                if "DENSITY_UNIT" in df_grouped_on_pvtnum.columns
                else "kg/m³",
                ratio_unit=df_grouped_on_pvtnum["RATIO_UNIT"].iloc[0]
                if "RATIO_UNIT" in df_grouped_on_pvtnum.columns
                else "Sm³/Sm³",
            )
            list_of_pvtdata.append(pvt_data)

    return list_of_pvtdata


def calculate_densities(data_frame: pd.DataFrame) -> pd.DataFrame:
    oil_density = data_frame.loc[data_frame["KEYWORD"] == "DENSITY", "OILDENSITY"].values[0]
    gas_density = data_frame.loc[data_frame["KEYWORD"] == "DENSITY", "GASDENSITY"].values[0]
    water_density = data_frame.loc[data_frame["KEYWORD"] == "DENSITY", "WATERDENSITY"].values[0]

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

    data_frame["DENSITY"] = data_frame.apply(
        lambda row: calculate_density(row["KEYWORD"], row["RATIO"], row["VOLUMEFACTOR"]),
        axis=1,
    )
    return data_frame
