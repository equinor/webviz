# type: ignore
# pylint: skip-file
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import xtgeo


def to_camel_case(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class WellBorePick(BaseModel):
    northing: float
    easting: float
    tvd: float
    tvd_msl: float
    md: float
    md_msl: float
    unique_wellbore_identifier: str
    pick_identifier: str
    confidence: Optional[str] = None
    depth_reference_point: str
    md_unit: str

    class Config:
        alias_generator = to_camel_case
        allow_population_by_field_name = True


class WellBoreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]


def decimate_xy(points, epsilon=1):
    # convert points to numpy array
    points = np.array(points)

    # get the start and end points in xy plane only
    start = np.tile(np.expand_dims(points[0, :2], axis=0), (points.shape[0], 1))
    end = np.tile(np.expand_dims(points[-1, :2], axis=0), (points.shape[0], 1))

    # find distance from other_points to line formed by start and end
    dist_point_to_line = np.abs(np.cross(end - start, points[:, :2] - start, axis=-1)) / np.linalg.norm(
        end - start, axis=-1
    )

    # get the index of the points with the largest distance
    max_idx = np.argmax(dist_point_to_line)
    max_value = dist_point_to_line[max_idx]

    result = []
    if max_value > epsilon:
        partial_results_left = decimate_xy(points[: max_idx + 1], epsilon)
        result += [list(i) for i in partial_results_left if list(i) not in result]
        partial_results_right = decimate_xy(points[max_idx:], epsilon)
        result += [list(i) for i in partial_results_right if list(i) not in result]
    else:
        result += [list(points[0]), list(points[-1])]

    return np.array(result)


def trajectory():
    well = xtgeo.well_from_file(
        "../../../../../../../current/webviz-subsurface-testdata/observed_data/drogon_wells/55_33-1.rmswell"
    )

    points = well.dataframe[["X_UTME", "Y_UTMN", "Z_TVDSS"]].values

    decimated = decimate_xy(points, epsilon=1)

    x = decimated[:, 0]
    y = decimated[:, 1]
    z = decimated[:, 2]
    md = well.dataframe[well.dataframe["Z_TVDSS"].isin(decimated[:, 2])]["MDepth"].values

    # ....
    trajectory = {
        "wellbore_uuid": "drogon_vertical",
        "unique_wellbore_identifier": "55/33-1",
        "tvd_msl_arr": z.tolist(),
        "md_arr": md.tolist(),
        "easting_arr": x.tolist(),
        "northing_arr": y.tolist(),
    }

    print(trajectory)


def picks():
    picks_df = pd.read_csv(
        "../../../../../../../current/webviz-subsurface-testdata/observed_data/drogon_well_picks/wellpicks.csv"
    )
    picks: WellBorePick = []
    identifiers = {
        "TopTherys": "Therys Fm. Top",
        "BaseTherys": "Therys Fm. Base",
        "TopVolon": "Volon Fm. Top",
        "BaseVolon": "Volon Fm. Base",
        "MSL": "MSL",
        "BaseVolantis": "Volantis Fm. Base",
        "TopVolantis": "Volantis Fm. Top",
    }
    for well_name, well_df in picks_df.groupby("WELL"):
        for horizon_name, horizon_df in well_df.groupby("HORIZON"):
            picks.append(
                WellBorePick(
                    northing=horizon_df["X_UTME"].values[0],
                    easting=horizon_df["Y_UTMN"].values[0],
                    tvd=round(horizon_df["Z_TVDSS"].values[0], 2),
                    tvd_msl=round(horizon_df["Z_TVDSS"].values[0]),
                    md=round(horizon_df["MD"].values[0]),
                    md_msl=round(horizon_df["MD"].values[0]),
                    unique_wellbore_identifier=well_name.replace("_", "/"),
                    pick_identifier=identifiers[horizon_name],
                    confidence=None,
                    depth_reference_point="RKB",
                    md_unit="m",
                )
            )
    import json

    with open("picks.json", "w") as f:
        json.dump([pick.__dict__ for pick in picks], f, indent=4)


picks()
