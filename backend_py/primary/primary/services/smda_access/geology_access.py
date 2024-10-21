"""Classes for accessing geology APIs"""

from enum import StrEnum

from webviz_pkg.core_utils.perf_timer import PerfTimer

from .smda_access import SmdaAccess
from .types import WellboreGeoHeader, WellboreGeoData
from .utils.queries import data_model_to_projection_param


class Endpoints(StrEnum):
    GEOLOGY_HEADERS = "wellbore-geology-headers"
    GEOLOGY_DATA = "wellbore-geology-data"


class GeologyAccess(SmdaAccess):
    async def get_geology_header(self, header_uuid: str) -> WellboreGeoHeader:
        """
        Returns a single header for a geological feature.
        """
        timer = PerfTimer()
        endpoint = Endpoints.GEOLOGY_HEADERS
        params = {
            "_projection": data_model_to_projection_param(WellboreGeoHeader),
            "_sort": "geol_type,identifier",
            "uuid": header_uuid,
        }

        result = await self._smda_get_request(endpoint=endpoint, params=params)
        parsed_header = WellboreGeoHeader(**result[0])

        print(f"TIME SMDA fetch wellbore geo headers took {timer.lap_s():.2f} seconds")
        return parsed_header

    async def get_wellbore_geology_headers(self, wellbore_uuid: str) -> list[WellboreGeoHeader]:
        """
        Returns a list of all lithological and paleogeographical headers for a given wellbore
        """
        timer = PerfTimer()
        endpoint = Endpoints.GEOLOGY_HEADERS
        params = {
            "_projection": data_model_to_projection_param(WellboreGeoHeader),
            "_sort": "geol_type,identifier",
            "wellbore_uuid": wellbore_uuid,
        }

        result = await self._smda_get_request(endpoint=endpoint, params=params)
        parsed_result = [WellboreGeoHeader(**header) for header in result]

        print(f"TIME SMDA fetch wellbore geo headers took {timer.lap_s():.2f} seconds")
        return parsed_result

    async def get_wellbore_geology_data(
        self, wellbore_uuid: str, geo_header_uuid: str | None = None
    ) -> list[WellboreGeoData]:
        """
        Returns all geology data entries for a given wellbore. Can optionally specify a
        wellbore geo header to limit the returned data
        """

        timer = PerfTimer()
        endpoint = Endpoints.GEOLOGY_DATA
        params = {
            "_projection": data_model_to_projection_param(WellboreGeoData),
            "_sort": "unique_wellbore_identifier,top_depth_md",
            "wellbore_uuid": wellbore_uuid,
            "wellbore_geol_header_uuid": geo_header_uuid,
        }

        result = await self._smda_get_request(endpoint=endpoint, params=params)
        parsed_result = [WellboreGeoData(**header) for header in result]

        print(f"TIME SMDA fetch wellbore geo data took {timer.lap_s():.2f} seconds")
        return parsed_result
