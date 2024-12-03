import logging
from typing import List, Optional

import polars as pl

from primary.services.service_exceptions import (
    Service,
    NoDataError,
)

from .types import WellborePick, WellboreTrajectory, WellboreHeader, StratigraphicUnit, StratigraphicSurface
from .stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from ._smda_get_request import smda_get_request

LOGGER = logging.getLogger(__name__)


class SmdaEndpoints:
    STRAT_UNITS = "strat-units"
    WELLBORE_SURVEY_HEADERS = "wellbore-survey-headers"
    WELLHEADERS = "wellheaders"
    WELLBORE_SURVEY_SAMPLES = "wellbore-survey-samples"
    WELLBORE_PICKS = "wellbore-picks"


class SmdaAccess:
    def __init__(self, access_token: str, field_identifier: str):
        self._smda_token = access_token
        self._field_identifier = field_identifier

    async def _smda_get_request(self, endpoint: str, params: dict) -> List[dict]:
        return await smda_get_request(access_token=self._smda_token, endpoint=endpoint, params=params)

    async def get_stratigraphic_units(self, strat_column_identifier: str) -> List[StratigraphicUnit]:
        """
        Get stratigraphic units for a given stratigraphic column
        """

        params = {
            "strat_column_identifier": strat_column_identifier,
            "_sort": "strat_unit_level,top_age",
        }
        results = await self._smda_get_request(endpoint=SmdaEndpoints.STRAT_UNITS, params=params)
        if not results:
            raise NoDataError(f"No stratigraphic units found for {strat_column_identifier=}.", Service.SMDA)
        units = [StratigraphicUnit(**result) for result in results]
        return units

    async def get_wellbore_headers(self) -> List[WellboreHeader]:
        """
        Get wellbore header information for all wellbores in a field.
        We need the wellbores with actual survey data, so we must use the wellbore-survey-headers endpoint.
        Additionally, we need the wellbore purpose and status, which we only get from the wellheaders endpoint.
        """
        projection = [
            "wellbore_uuid",
            "unique_wellbore_identifier",
            "well_uuid",
            "unique_well_identifier",
            "well_easting",
            "well_northing",
            "depth_reference_point",
            "depth_reference_elevation",
        ]
        params = {
            "_projection": ",".join(projection),
            "_sort": "unique_wellbore_identifier",
            "field_identifier": self._field_identifier,
        }

        survey_header_results = await self._smda_get_request(
            endpoint=SmdaEndpoints.WELLBORE_SURVEY_HEADERS, params=params
        )

        if not survey_header_results:
            raise NoDataError(f"No wellbore headers found for {self._field_identifier=}.", Service.SMDA)

        projection = ["unique_wellbore_identifier", "wellbore_purpose", "wellbore_status"]
        params = {
            "_projection": ",".join(projection),
            "_sort": "unique_wellbore_identifier",
            "field_identifier": self._field_identifier,
        }

        wellbore_headers_results = await self._smda_get_request(endpoint=SmdaEndpoints.WELLHEADERS, params=params)

        # Create a dictionary to map unique wellbore identifiers to wellbore headers for faster lookup
        wellbore_headers_dict = {
            wellbore_header["unique_wellbore_identifier"]: wellbore_header
            for wellbore_header in wellbore_headers_results
        }

        # Iterate over the survey headers and update the information from wellbore headers if available
        for survey_header in survey_header_results:
            unique_id = survey_header["unique_wellbore_identifier"]

            wellbore_header = wellbore_headers_dict.get(unique_id)
            if wellbore_header:
                survey_header["wellbore_purpose"] = wellbore_header.get("wellbore_purpose")
                survey_header["wellbore_status"] = wellbore_header.get("wellbore_status")

        return [WellboreHeader(**result) for result in survey_header_results]

    async def get_wellbore_trajectories(self, wellbore_uuids: Optional[List[str]] = None) -> List[WellboreTrajectory]:
        """
        Get wellbore trajectories (survey samples) for all wells in a field, optionally with a subset of wellbores.
        """
        params = {
            "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
            "_sort": "unique_wellbore_identifier,md",
            "field_identifier": self._field_identifier,
        }
        if wellbore_uuids:
            params["wellbore_uuid"] = ", ".join(wellbore_uuids)

        result = await self._smda_get_request(endpoint=SmdaEndpoints.WELLBORE_SURVEY_SAMPLES, params=params)

        if not result:
            raise NoDataError(
                f"No wellbore surveys found for {self._field_identifier}, {wellbore_uuids=}.", Service.SMDA
            )

        # Convert the result to polars for processing
        resultdf = pl.DataFrame(result)

        # Identify wellbores with any null values in survey columns
        columns_to_check = ["tvd_msl", "md", "easting", "northing"]

        # Warn of any wellbores with null values in survey columns
        wellbores_with_nulls = (
            resultdf.filter(pl.any_horizontal(pl.col(columns_to_check).is_null()))
            .get_column("unique_wellbore_identifier")
            .unique()
            .sort()
            .to_list()
        )
        if wellbores_with_nulls:
            for wellbore in wellbores_with_nulls:
                LOGGER.warning(f"Invalid survey samples found for wellbore: {wellbore}. These will be ignored.")

        # Filter out any samples with null values
        filtered_df = resultdf.filter(pl.all_horizontal(pl.col(columns_to_check).is_not_null()))

        # Group per wellbore, maintaining order
        wellbore_data = filtered_df.group_by("unique_wellbore_identifier", maintain_order=True).agg(
            [
                pl.col("wellbore_uuid").first().alias("wellbore_uuid"),
                pl.col("tvd_msl").alias("tvd_msl_arr"),
                pl.col("md").alias("md_arr"),
                pl.col("easting").alias("easting_arr"),
                pl.col("northing").alias("northing_arr"),
            ]
        )

        wellbore_trajectories: List[WellboreTrajectory] = [
            WellboreTrajectory(
                wellbore_uuid=row["wellbore_uuid"],
                unique_wellbore_identifier=row["unique_wellbore_identifier"],
                tvd_msl_arr=row["tvd_msl_arr"],
                md_arr=row["md_arr"],
                easting_arr=row["easting_arr"],
                northing_arr=row["northing_arr"],
            )
            for row in wellbore_data.iter_rows(named=True)
        ]
        return wellbore_trajectories

    async def get_wellbore_picks_for_wellbore(
        self, wellbore_uuid: str, obs_no: Optional[int] = None
    ) -> List[WellborePick]:
        """
        Get wellbore picks for a given wellbore uuid. I.e. picks for each pick identifier (surface)
        with the matching wellbore uuid.
        """

        params = {
            "_sort": "unique_wellbore_identifier,md",
            "wellbore_uuid": wellbore_uuid,
            "interpreter": "STAT",
        }
        if obs_no:
            params["obs_no"] = str(obs_no)
        results = await self._smda_get_request(endpoint=SmdaEndpoints.WELLBORE_PICKS, params=params)

        if not results:
            raise NoDataError(f"No wellbore picks found for {wellbore_uuid=}.", Service.SMDA)

        picks: List[WellborePick] = []
        for result in results:
            # Drop any picks with missing data
            if all(result.get(key) for key in ["northing", "easting", "tvd", "tvd_msl"]):
                picks.append(WellborePick(**result))
            else:
                LOGGER.warning(
                    f"Invalid pick found for {result.get('pick_identifier')}, {result.get('unique_wellbore_identifier')}. This will be ignored."
                )
        return picks

    async def get_wellbore_picks_for_pick_identifier(
        self,
        pick_identifier: str,
        interpreter: str = "STAT",
        obs_no: Optional[int] = None,
    ) -> List[WellborePick]:
        """
        Get wellbore picks for a given pick identifier(formation top/base)
        for all wellbores in a field
        """
        params = {
            "_sort": "unique_wellbore_identifier,md",
            "field_identifier": self._field_identifier,
            "pick_identifier": pick_identifier,
            "interpreter": interpreter,
        }
        if obs_no:
            params["obs_no"] = str(obs_no)

        results = await self._smda_get_request(endpoint=SmdaEndpoints.WELLBORE_PICKS, params=params)
        if not results:
            raise NoDataError(
                f"No wellbore picks found for {self._field_identifier=}, {pick_identifier=}, {interpreter=}, {obs_no=}.",
                Service.SMDA,
            )
        picks: List[WellborePick] = []
        for result in results:
            # Drop any picks with missing data
            if all(result.get(key) for key in ["northing", "easting", "tvd", "tvd_msl"]):
                picks.append(WellborePick(**result))
            else:
                LOGGER.warning(
                    f"Invalid pick found for {pick_identifier=}, {result.get('unique_wellbore_identifier')}. This will be ignored."
                )
        return picks

    async def get_wellbore_pick_identifiers_in_stratigraphic_column(
        self, strat_column_identifier: str
    ) -> List[StratigraphicSurface]:
        """
        Get all potential pick identifiers (formation tops/bases) given a stratigraphic column.
        """
        units = await self.get_stratigraphic_units(strat_column_identifier)
        sorted_surfaces = sort_stratigraphic_names_by_hierarchy(units, only_include_top_and_base=True)
        return sorted_surfaces
