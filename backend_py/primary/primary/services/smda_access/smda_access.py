import logging
from typing import List, Optional

import polars as pl

from primary.services.service_exceptions import (
    Service,
    NoDataError,
)

from .types import (
    WellborePick,
    WellboreTrajectory,
    WellboreHeader,
    StratigraphicUnit,
    StratigraphicSurface,
    StratigraphicColumn,
    WellboreStratigraphicUnit,
    WellboreSurveyHeader,
    WellboreSurveySample,
)
from .utils.queries import data_model_to_projection_param
from .stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from ._smda_get_request import smda_get_request_async, smda_get_aggregation_request_async


LOGGER = logging.getLogger(__name__)


class SmdaEndpoints:
    STRAT_UNITS = "strat-units"
    WELLBORE_STRATIGRAPHY = "wellbore-stratigraphy"
    WELLBORE_STRAT_COLUMN = "wellbore-strat-columns"
    WELLBORE_SURVEY_HEADERS = "wellbore-survey-headers"
    WELLHEADERS = "wellheaders"
    WELLBORE_SURVEY_SAMPLES = "wellbore-survey-samples"
    WELLBORE_PICKS = "wellbore-picks"
    WELLBORE_PICKS_STRAT_COLUM = "wellbore-picks-columns"


class SmdaAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    async def _smda_get_request_async(self, endpoint: str, params: dict) -> List[dict]:
        return await smda_get_request_async(access_token=self._smda_token, endpoint=endpoint, params=params)

    async def _smda_get_aggregation_request_async(self, endpoint: str, params: dict) -> dict:
        return await smda_get_aggregation_request_async(access_token=self._smda_token, endpoint=endpoint, params=params)

    async def get_stratigraphic_units_async(
        self,
        strat_column_identifier: str,
        wellbore_uuid: Optional[str] = None,
        sort: Optional[list[str]] = None,
    ) -> List[StratigraphicUnit]:
        """
        Get stratigraphic units for a given stratigraphic column.
        Can optionally include a wellbore uuid to futher filter the age
        """

        params = {
            "_projection": data_model_to_projection_param(StratigraphicUnit),
            "strat_column_identifier": strat_column_identifier,
            "_sort": "strat_unit_level,top_age",
        }

        # Add optional fields, if they exist
        if wellbore_uuid:
            params.update({"wellbore_uuid": wellbore_uuid})
        if sort:
            params.update({"_sort": ",".join(sort)})

        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.STRAT_UNITS, params=params)
        if not results:
            raise NoDataError(f"No stratigraphic units found for {strat_column_identifier=}.", Service.SMDA)
        units = [StratigraphicUnit(**result) for result in results]
        return units

    async def get_stratigraphic_columns_for_wellbore_async(self, wellbore_uuid: str) -> list[StratigraphicColumn]:
        """Fetches a list of all stratigrapic columns avaialbe for a specific wellbore"""
        endpoint = SmdaEndpoints.WELLBORE_STRAT_COLUMN
        params = {
            "_projection": data_model_to_projection_param(StratigraphicColumn),
            "wellbore_uuid": wellbore_uuid,
            # Sorting to facilitate deduping. Prioritize the most newly updated entry
            "_sort": "strat_column_identifier,update_date",
            "_order": "desc",
        }

        results = await self._smda_get_request_async(endpoint=endpoint, params=params)

        # Returned columns are sometimes duplicated with all main fields as the same (atleast as far as I can see, only timestamps and uuid are different). We will dedupe the list by only picking the newest entry, which will be sorted to the top
        seen_idents = set()
        valid_data = []

        for result in results:
            column = StratigraphicColumn(**result)

            if column.strat_column_identifier not in seen_idents:
                seen_idents.add(column.strat_column_identifier)
                valid_data.append(column)

        return valid_data

    async def get_stratigraphy_for_wellbore_and_column_async(
        self, wellbore_uuid: str, strat_column_ident: str
    ) -> list[WellboreStratigraphicUnit]:
        """
        Get a list of all well-picks for a wellbore within a stratigraphic column
        """
        endpoint = SmdaEndpoints.WELLBORE_STRATIGRAPHY
        params = {
            "_projection": data_model_to_projection_param(WellboreStratigraphicUnit),
            "_sort": "entry_md",
            "wellbore_uuid": wellbore_uuid,
            "strat_column_identifier": strat_column_ident,
        }

        results = await self._smda_get_request_async(endpoint=endpoint, params=params)

        if not results:
            raise NoDataError(
                f"No stratigraphic entries found for wellbore {wellbore_uuid=} in column {strat_column_ident=}.",
                Service.SMDA,
            )

        return [WellboreStratigraphicUnit(**result) for result in results]

    async def get_survey_headers_for_wellbore_async(self, wellbore_uuid: str) -> list[WellboreSurveyHeader]:
        """
        Fetches all survey headers for a given wellbore
        """
        params = {
            "wellbore_uuid": wellbore_uuid,
            "_projection": data_model_to_projection_param(WellboreSurveyHeader),
            "_sort": "survey_date",
            "_order": "desc",
        }

        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_SURVEY_HEADERS, params=params)

        return [WellboreSurveyHeader(**result) for result in results]

    async def get_survey_samples_for_wellbore_async(
        self, wellbore_uuid: str, survey_identifier: str
    ) -> list[WellboreSurveySample]:
        """
        Fetches all survey sample data for a survey on a wellbore
        """

        params = {
            "wellbore_uuid": wellbore_uuid,
            "survey_identifier": survey_identifier,
            "_projection": data_model_to_projection_param(WellboreSurveySample),
            "_sort": "md",
        }

        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_SURVEY_SAMPLES, params=params)

        return [WellboreSurveySample(**result) for result in results]

    async def get_wellbore_headers_async(self, field_identifier: str) -> List[WellboreHeader]:
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
            "field_identifier": field_identifier,
        }

        survey_header_results = await self._smda_get_request_async(
            endpoint=SmdaEndpoints.WELLBORE_SURVEY_HEADERS, params=params
        )

        if not survey_header_results:
            raise NoDataError(f"No wellbore headers found for {field_identifier=}.", Service.SMDA)

        projection = ["unique_wellbore_identifier", "wellbore_purpose", "wellbore_status"]
        params = {
            "_projection": ",".join(projection),
            "_sort": "unique_wellbore_identifier",
            "field_identifier": field_identifier,
        }

        wellbore_headers_results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLHEADERS, params=params)

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

    async def get_wellbore_trajectories_async(
        self, field_identifier: str, wellbore_uuids: Optional[List[str]] = None
    ) -> List[WellboreTrajectory]:
        """
        Get wellbore trajectories (survey samples) for all wells in a field, optionally with a subset of wellbores.
        """
        params = {
            "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
            "_sort": "unique_wellbore_identifier,md",
            "field_identifier": field_identifier,
        }
        if wellbore_uuids:
            params["wellbore_uuid"] = ", ".join(wellbore_uuids)

        result = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_SURVEY_SAMPLES, params=params)

        if not result:
            raise NoDataError(f"No wellbore surveys found for {field_identifier=}, {wellbore_uuids=}.", Service.SMDA)

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

    async def get_wellbore_picks_for_wellbore_async(
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
        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_PICKS, params=params)

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

    async def get_wellbore_picks_for_pick_identifier_async(
        self,
        field_identifier: str,
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
            "field_identifier": field_identifier,
            "pick_identifier": pick_identifier,
            "interpreter": interpreter,
        }
        if obs_no:
            params["obs_no"] = str(obs_no)

        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_PICKS, params=params)
        if not results:
            raise NoDataError(
                f"No wellbore picks found for {field_identifier=}, {pick_identifier=}, {interpreter=}, {obs_no=}.",
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

    async def get_wellbore_picks_in_stratigraphic_column_async(
        self,
        wellbore_uuid: str,
        strat_column_identifier: str,
    ) -> List[WellborePick]:
        """
        Get wellbore picks within a column for a given wellbore
        """

        params = {
            "_sort": "md",
            "_projection": data_model_to_projection_param(WellborePick),
            "strat_column_identifier": strat_column_identifier,
            "wellbore_uuid": wellbore_uuid,
        }

        results = await self._smda_get_request_async(endpoint=SmdaEndpoints.WELLBORE_PICKS_STRAT_COLUM, params=params)
        if not results:
            raise NoDataError(
                f"No wellbore picks found for {wellbore_uuid}, {strat_column_identifier=}.",
                Service.SMDA,
            )

        return [WellborePick(**result) for result in results]

    async def get_wellbore_pick_identifiers_in_stratigraphic_column_async(
        self, strat_column_identifier: str
    ) -> List[StratigraphicSurface]:
        """
        Get all potential pick identifiers (formation tops/bases) given a stratigraphic column.
        """
        units = await self.get_stratigraphic_units_async(strat_column_identifier)
        sorted_surfaces = sort_stratigraphic_names_by_hierarchy(units, only_include_top_and_base=True)
        return sorted_surfaces
