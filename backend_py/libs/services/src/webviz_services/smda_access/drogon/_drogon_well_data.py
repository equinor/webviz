from typing import List
import numpy as np

from ..types import WellboreTrajectory, WellboreHeader, WellborePick, StratigraphicColumn


def get_drogon_strat_columns() -> List[StratigraphicColumn]:
    return [
        StratigraphicColumn(
            strat_column_identifier="DROGON_HAS_NO_STRATCOLUMN",
            strat_column_type="lithostratigraphy",
            strat_column_area_type="field",
            strat_column_status="official",
        ),
    ]


# (wellbore_uuid, unique_wellbore_identifier, easting, northing, rkb, md_max)
_DROGON_VERTICAL_WELLS = [
    ("drogon_vertical", "55/33-1", 462480.0, 5934232.0, 25.0, 1799.5),
    ("drogon_55_33-2", "55/33-2", 460000.0, 5935200.0, 25.0, 1799.5),
    ("drogon_55_33-3", "55/33-3", 465100.0, 5931340.0, 25.0, 1799.5),
    ("drogon_55_33-A-1", "55/33-A-1", 462588.52, 5934080.96, 49.0, 1849.0),
    ("drogon_55_33-A-2", "55/33-A-2", 460994.9, 5933813.29, 49.0, 1849.0),
    ("drogon_55_33-A-3", "55/33-A-3", 462753.44, 5932869.64, 49.0, 1849.0),
    ("drogon_55_33-A-5", "55/33-A-5", 461519.21, 5935692.65, 49.0, 1849.0),
    ("drogon_55_33-A-6", "55/33-A-6", 461292.74, 5931883.26, 49.0, 1849.0),
]


def get_drogon_well_headers() -> List[WellboreHeader]:
    return [
        *[
            WellboreHeader(
                wellbore_uuid=uuid,
                unique_wellbore_identifier=identifier,
                well_uuid=uuid,
                unique_well_identifier=identifier,
                well_easting=easting,
                well_northing=northing,
                depth_reference_point="RKB",
                depth_reference_elevation=rkb,
                wellbore_purpose="production",
                wellbore_status="active",
                md_min=0.0,
                md_max=md_max,
                md_unit="m",
                tvd_min=-rkb,
                tvd_max=md_max - rkb,
                tvd_unit="m",
                kickoff_depth_md=None,
                kickoff_depth_tvd=None,
                parent_wellbore=None,
            )
            for uuid, identifier, easting, northing, rkb, md_max in _DROGON_VERTICAL_WELLS
        ],
        WellboreHeader(
            wellbore_uuid="drogon_horizontal",
            unique_wellbore_identifier="55/33-A-4",
            well_uuid="drogon_horizontal",
            unique_well_identifier="55/33-A-4",
            well_easting=463256.911,
            well_northing=5930542.294,
            depth_reference_point="RKB",
            depth_reference_elevation=49.0,
            wellbore_purpose="production",
            wellbore_status="active",
            md_min=0.0,
            md_max=3578.5,
            md_unit="m",
            tvd_min=-49.0,
            tvd_max=1656.9874,
            tvd_unit="m",
            kickoff_depth_md=None,
            kickoff_depth_tvd=None,
            parent_wellbore=None,
        ),
    ]


def get_drogon_well_trajectories() -> List[WellboreTrajectory]:
    # Original second wellbore data
    original_tvd_msl = np.array([-49.0, 1293.4185, 1536.9384, 1616.4998, 1630.5153, 1656.9874])
    original_easting = np.array([463256.911, 463564.402, 463637.925, 463690.658, 463910.452, 464465.876])
    original_northing = np.array([5930542.294, 5931057.803, 5931184.235, 5931278.837, 5931688.122, 5932767.761])
    original_md = np.array([0.0, 1477.0, 1761.5, 1899.2601, 2363.9988, 3578.5])

    # Create 100x more sample points using linear interpolation
    num_original_points = len(original_md)
    num_interpolated_points = (num_original_points - 1) * 100 + 1

    # Interpolate based on MD (measured depth) as the independent variable
    md_interp = np.linspace(original_md[0], original_md[-1], num_interpolated_points)
    tvd_msl_interp = np.interp(md_interp, original_md, original_tvd_msl)
    easting_interp = np.interp(md_interp, original_md, original_easting)
    northing_interp = np.interp(md_interp, original_md, original_northing)

    return [
        *[
            WellboreTrajectory(
                wellbore_uuid=uuid,
                unique_wellbore_identifier=identifier,
                tvd_msl_arr=[-rkb, md_max - rkb],
                md_arr=[0.0, md_max],
                easting_arr=[easting, easting],
                northing_arr=[northing, northing],
            )
            for uuid, identifier, easting, northing, rkb, md_max in _DROGON_VERTICAL_WELLS
        ],
        WellboreTrajectory(
            wellbore_uuid="drogon_horizontal",
            unique_wellbore_identifier="55/33-A-4",
            tvd_msl_arr=tvd_msl_interp.tolist(),
            md_arr=md_interp.tolist(),
            easting_arr=easting_interp.tolist(),
            northing_arr=northing_interp.tolist(),
        ),
    ]


_DROGON_PICK_NAMES = {
    "TopVolantis": "Volantis Fm. Top",
    "TopTherys": "Therys Fm. Top",
    "TopVolon": "Volon Fm. Top",
    "BaseVolantis": "Volantis Fm. Base",
}

# Exported from RMS: (md, well, horizon, tvd_msl, rkb, easting, northing)
_DROGON_PICKS = [
    (1616.5685, "55_33-2", "TopVolantis", 1591.5685, 25.0, 460000.0, 5935200.0),
    (1644.9184, "55_33-A-1", "TopVolantis", 1595.9185, 49.0, 462588.52, 5934080.96),
    (1625.5725, "55_33-1", "TopVolantis", 1600.5725, 25.0, 462480.0, 5934232.0),
    (1653.4718, "55_33-A-3", "TopVolantis", 1604.4718, 49.0, 462753.44, 5932869.64),
    (1636.3773, "55_33-2", "TopTherys", 1611.3773, 25.0, 460000.0, 5935200.0),
    (1664.2761, "55_33-A-1", "TopTherys", 1615.2761, 49.0, 462588.52, 5934080.96),
    (1645.0812, "55_33-1", "TopTherys", 1620.0812, 25.0, 462480.0, 5934232.0),
    (1671.1789, "55_33-A-3", "TopTherys", 1622.1790, 49.0, 462753.44, 5932869.64),
    (1674.1801, "55_33-A-1", "TopVolon", 1625.1801, 49.0, 462588.52, 5934080.96),
    (1654.5354, "55_33-2", "TopVolon", 1629.5354, 25.0, 460000.0, 5935200.0),
    (1655.4358, "55_33-1", "TopVolon", 1630.4358, 25.0, 462480.0, 5934232.0),
    (1682.7335, "55_33-A-3", "TopVolon", 1633.7335, 49.0, 462753.44, 5932869.64),
    (1660.0879, "55_33-2", "BaseVolantis", 1635.0879, 25.0, 460000.0, 5935200.0),
    (1689.7863, "55_33-A-1", "BaseVolantis", 1640.7863, 49.0, 462588.52, 5934080.96),
    (1692.9376, "55_33-A-2", "TopVolantis", 1643.9376, 49.0, 460994.9, 5933813.29),
    (1670.4425, "55_33-1", "BaseVolantis", 1645.4425, 25.0, 462480.0, 5934232.0),
    (1698.3397, "55_33-A-3", "BaseVolantis", 1649.3397, 49.0, 462753.44, 5932869.64),
    (1683.3483, "55_33-3", "TopVolantis", 1658.3483, 25.0, 465100.0, 5931340.0),
    (1710.7947, "55_33-A-2", "TopTherys", 1661.7947, 49.0, 460994.9, 5933813.29),
    (1701.0561, "55_33-3", "TopTherys", 1676.0562, 25.0, 465100.0, 5931340.0),
    (1701.0561, "55_33-3", "TopVolon", 1676.0562, 25.0, 465100.0, 5931340.0),
    (1726.8511, "55_33-A-2", "TopVolon", 1677.8511, 49.0, 460994.9, 5933813.29),
    (1731.3529, "55_33-A-5", "TopVolantis", 1682.3529, 49.0, 461519.21, 5935692.65),
    (1735.4046, "55_33-A-2", "BaseVolantis", 1686.4045, 49.0, 460994.9, 5933813.29),
    (1742.9076, "55_33-A-6", "TopVolantis", 1693.9076, 49.0, 461292.74, 5931883.26),
    (1753.1116, "55_33-A-5", "TopTherys", 1704.1116, 49.0, 461519.21, 5935692.65),
    (1733.0204, "55_33-3", "BaseVolantis", 1708.0204, 25.0, 465100.0, 5931340.0),
    (1758.3637, "55_33-A-6", "TopTherys", 1709.3636, 49.0, 461292.74, 5931883.26),
    (1766.7671, "55_33-A-5", "TopVolon", 1717.7671, 49.0, 461519.21, 5935692.65),
    (1775.3205, "55_33-A-6", "TopVolon", 1726.3206, 49.0, 461292.74, 5931883.26),
    (1777.1212, "55_33-A-5", "BaseVolantis", 1728.1212, 49.0, 461519.21, 5935692.65),
    (1783.8739, "55_33-A-6", "BaseVolantis", 1734.8739, 49.0, 461292.74, 5931883.26),
    (2233.9352, "55_33-A-4", "TopVolantis", 1628.1982, 49.0, 463849.6888047851, 5931573.151211523),
    (3040.7062, "55_33-A-4", "TopTherys", 1641.1917, 49.0, 464220.0686875976, 5932289.733486914),
    (3040.7062, "55_33-A-4", "TopVolon", 1641.1917, 49.0, 464220.0686875976, 5932289.733486914),
]


def get_drogon_well_picks() -> List[WellborePick]:
    uuid_by_identifier = {identifier: uuid for uuid, identifier, *_ in _DROGON_VERTICAL_WELLS}
    uuid_by_identifier["55/33-A-4"] = "drogon_horizontal"

    picks = []
    for md, well, horizon, tvd_msl, rkb, easting, northing in _DROGON_PICKS:
        identifier = well.replace("_", "/")
        picks.append(
            WellborePick(
                obs_no=1,
                interpreter="DROGON_STAT",
                easting=easting,
                northing=northing,
                tvd=round(tvd_msl + rkb, 4),
                tvd_msl=tvd_msl,
                md=md,
                md_msl=round(md - rkb, 4),
                unique_wellbore_identifier=identifier,
                wellbore_uuid=uuid_by_identifier[identifier],
                pick_identifier=_DROGON_PICK_NAMES[horizon],
                confidence=None,
                depth_reference_point="RKB",
                md_unit="m",
            )
        )
    return picks
