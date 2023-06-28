# type: ignore
# pylint: skip-file
import numpy as np
import xtgeo


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


well = xtgeo.well_from_file("./webviz-subsurface-testdata/observed_data/drogon_wells/55_33-1.rmswell")

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
