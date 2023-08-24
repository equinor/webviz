from typing import List, Optional

from ..types import WellBorePick, WellBoreTrajectory, WellBoreHeader


class WellAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    # type: ignore
    # pylint: disable=unused-argument
    def get_wellbore_picks(self, field_identifier: str, pick_identifier: str) -> List[WellBorePick]:
        """Get Drogon picks"""
        return []

    # type: ignore
    # pylint: disable=unused-argument
    def get_field_wellbore_trajectories(
        self, field_identifier: str, unique_wellbore_identifiers: Optional[List[str]] = None
    ) -> List[WellBoreTrajectory]:
        """Get all Drogon trajectories"""
        return [
            WellBoreTrajectory(
                wellbore_uuid="drogon_vertical",
                unique_wellbore_identifier="55/33-1",
                tvd_msl_arr=[-25.0, 1774.5],
                md_arr=[0.0, 1799.5],
                easting_arr=[462480.0, 462480.0],
                northing_arr=[5934232.0, 5934232.0],
            ),
            WellBoreTrajectory(
                wellbore_uuid="drogon_horizontal",
                unique_wellbore_identifier="55/33-A-4",
                tvd_msl_arr=[-49.0, 1293.4185, 1536.9384, 1616.4998, 1630.5153, 1656.9874],
                md_arr=[0.0, 1477.0, 1761.5, 1899.2601, 2363.9988, 3578.5],
                easting_arr=[463256.911, 463564.402, 463637.925, 463690.658, 463910.452, 464465.876],
                northing_arr=[5930542.294, 5931057.803, 5931184.235, 5931278.837, 5931688.122, 5932767.761],
            ),
        ]

    def get_wellbore_trajectories(self, wellbore_uuids: List[str]) -> List[WellBoreTrajectory]:
        """Get Drogon trajectory"""
        trajs: List[WellBoreTrajectory] = []
        if "drogon_horizontal" in wellbore_uuids:
            trajs.append(
                WellBoreTrajectory(
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
                WellBoreTrajectory(
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
    def get_well_headers(self, field_identifier: str) -> List[WellBoreHeader]:
        """Get Drogon well headers"""
        return [
            WellBoreHeader(
                wellbore_uuid="drogon_vertical",
                unique_wellbore_identifier="55/33-1",
                easting=462480.000,
                northing=5934232.000,
                wellbore_purpose="production",
            ),
            WellBoreHeader(
                wellbore_uuid="drogon_horizontal",
                unique_wellbore_identifier="55/33-A-4",
                easting=463256.911,
                northing=5930542.294,
                wellbore_purpose="production",
            ),
        ]
