from typing import List

from ..types import WellboreTrajectory, WellboreHeader, WellborePick


def get_drogon_well_headers() -> List[WellboreHeader]:
    return [
        WellboreHeader(
            wellbore_uuid="drogon_vertical",
            unique_wellbore_identifier="55/33-1",
            well_uuid="drogon_vertical",
            unique_well_identifier="55/33-1",
            well_easting=462480.000,
            well_northing=5934232.000,
            depth_reference_point="RKB",
            depth_reference_elevation=25.0,
            wellbore_purpose="production",
            wellbore_status="active",
        ),
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
        ),
    ]


def get_drogon_well_trajectories() -> List[WellboreTrajectory]:
    return [
        WellboreTrajectory(
            wellbore_uuid="drogon_vertical",
            unique_wellbore_identifier="55/33-1",
            tvd_msl_arr=[-25.0, 1774.5],
            md_arr=[0.0, 1799.5],
            easting_arr=[462480.0, 462480.0],
            northing_arr=[5934232.0, 5934232.0],
        ),
        WellboreTrajectory(
            wellbore_uuid="drogon_horizontal",
            unique_wellbore_identifier="55/33-A-4",
            tvd_msl_arr=[-49.0, 1293.4185, 1536.9384, 1616.4998, 1630.5153, 1656.9874],
            md_arr=[0.0, 1477.0, 1761.5, 1899.2601, 2363.9988, 3578.5],
            easting_arr=[463256.911, 463564.402, 463637.925, 463690.658, 463910.452, 464465.876],
            northing_arr=[5930542.294, 5931057.803, 5931184.235, 5931278.837, 5931688.122, 5932767.761],
        ),
    ]


def get_drogon_well_picks() -> List[WellborePick]:
    return [
        WellborePick(
            interpreter="DROGON_STAT",
            easting=462480.0,
            northing=5934232.0,
            tvd=1645.44,
            tvd_msl=1645.0,
            md=1670.0,
            md_msl=1670.0,
            unique_wellbore_identifier="55/33-1",
            wellbore_uuid="drogon_vertical",
            pick_identifier="Volantis Fm. Base",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=462480.0,
            northing=5934232.0,
            tvd=0.0,
            tvd_msl=0.0,
            md=0.0,
            md_msl=0.0,
            unique_wellbore_identifier="55/33-1",
            wellbore_uuid="drogon_vertical",
            pick_identifier="MSL",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=462480.0,
            northing=5934232.0,
            tvd=1620.08,
            tvd_msl=1620.0,
            md=1645.0,
            md_msl=1645.0,
            unique_wellbore_identifier="55/33-1",
            wellbore_uuid="drogon_vertical",
            pick_identifier="Therys Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=462480.0,
            northing=5934232.0,
            tvd=1600.57,
            tvd_msl=1601.0,
            md=1626.0,
            md_msl=1626.0,
            unique_wellbore_identifier="55/33-1",
            wellbore_uuid="drogon_vertical",
            pick_identifier="Volantis Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=462480.0,
            northing=5934232.0,
            tvd=1630.44,
            tvd_msl=1630.0,
            md=1655.0,
            md_msl=1655.0,
            unique_wellbore_identifier="55/33-1",
            wellbore_uuid="drogon_vertical",
            pick_identifier="Volon Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=463256.9114,
            northing=5930542.2944,
            tvd=0.0,
            tvd_msl=0.0,
            md=0.0,
            md_msl=0.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="MSL",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=464220.0686875976,
            northing=5932289.733486914,
            tvd=1641.19,
            tvd_msl=1641.0,
            md=3041.0,
            md_msl=3041.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="Therys Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=463849.68880478514,
            northing=5931573.151211523,
            tvd=1628.2,
            tvd_msl=1628.0,
            md=2234.0,
            md_msl=2234.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="Volantis Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=464220.0686875976,
            northing=5932289.733486914,
            tvd=1641.19,
            tvd_msl=1641.0,
            md=3041.0,
            md_msl=3041.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="Volon Fm. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=463256.9114,
            northing=5930542.2944,
            tvd=1828.2,
            tvd_msl=1828.0,
            md=2434.0,
            md_msl=2434.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="VOLANTIS GP. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=464220.0686875976,
            northing=5932289.733486914,
            tvd=1841.19,
            tvd_msl=1841.0,
            md=3241.0,
            md_msl=3241.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="VOLANTIS GP. Top",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=463849.68880478514,
            northing=5931573.151211523,
            tvd=1628.2,
            tvd_msl=1628.0,
            md=2234.0,
            md_msl=2234.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="VOLANTIS GP. Base",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
        WellborePick(
            interpreter="DROGON_STAT",
            easting=464220.0686875976,
            northing=5932289.733486914,
            tvd=1641.19,
            tvd_msl=1641.0,
            md=3041.0,
            md_msl=3041.0,
            unique_wellbore_identifier="55/33-A-4",
            wellbore_uuid="drogon_horizontal",
            pick_identifier="VOLANTIS GP. Base",
            confidence=None,
            depth_reference_point="RKB",
            md_unit="m",
        ),
    ]
