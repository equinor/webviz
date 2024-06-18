from typing import List, Optional

from ..types import WellborePick, WellboreTrajectory, WellboreHeader

from ._mocked_wellbore_picks import mocked_wellbore_picks


class WellAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    # type: ignore
    # pylint: disable=unused-argument
    async def get_all_picks_for_wellbore(self, wellbore_uuid: str) -> List[WellborePick]:
        """Get Drogon picks"""
        if wellbore_uuid == "drogon_horizontal":
            well_picks = [pick for pick in mocked_wellbore_picks if pick.unique_wellbore_identifier == "55/33-A-4"]
        elif wellbore_uuid == "drogon_vertical":
            well_picks = [pick for pick in mocked_wellbore_picks if pick.unique_wellbore_identifier == "55/33-1"]
        return well_picks

    # type: ignore
    # pylint: disable=unused-argument
    async def get_field_wellbore_trajectories(
        self, field_identifier: str, unique_wellbore_identifiers: Optional[List[str]] = None
    ) -> List[WellboreTrajectory]:
        """Get all Drogon trajectories"""
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

    async def get_wellbore_trajectories(self, wellbore_uuids: List[str]) -> List[WellboreTrajectory]:
        """Get Drogon trajectory"""
        trajs: List[WellboreTrajectory] = []
        if "drogon_horizontal" in wellbore_uuids:
            trajs.append(
                WellboreTrajectory(
                    wellbore_uuid="drogon_horizontal",
                    unique_wellbore_identifier="55/33-A-4",
                    tvd_msl_arr=[-49.0, 1293.4185, 1536.9384, 1616.4998, 1630.5153, 1656.9874],
                    md_arr=[0.0, 1477.0, 1761.5, 1899.2601, 2363.9988, 3578.5],
                    easting_arr=[463256.911, 463564.402, 463637.925, 463690.658, 463910.452, 464465.876],
                    northing_arr=[5930542.294, 5931057.803, 5931184.235, 5931278.837, 5931688.122, 5932767.761],
                )
            )
        if "drogon_vertical" in wellbore_uuids:
            trajs.append(
                WellboreTrajectory(
                    wellbore_uuid="drogon_vertical",
                    unique_wellbore_identifier="55/33-1",
                    tvd_msl_arr=[-25.0, 1774.5],
                    md_arr=[0.0, 1799.5],
                    easting_arr=[462480.0, 462480.0],
                    northing_arr=[5934232.0, 5934232.0],
                )
            )
        return trajs

    # type: ignore
    # pylint: disable=unused-argument
    async def get_wellbore_headers(self, field_identifier: str) -> List[WellboreHeader]:
        """Get Drogon wellbore headers"""
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
            ),
        ]
