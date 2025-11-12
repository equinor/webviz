import logging
from typing import List, Optional

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Polygons


from webviz_core_utils.perf_timer import PerfTimer
from webviz_services.service_exceptions import Service, InvalidDataError, NoDataError, MultipleDataMatchesError
from .generic_types import SumoContent
from .polygons_types import PolygonsMeta, PolygonData
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class PolygonsAccess:
    """
    Access class for retrieving sets of polygons from Sumo.

    This class handles polygons stored as individual items in dataio/sumo.
    In practice these are polygon sets, such as fault networks, where each
    polygon object in Sumo contains multiple geometrically distinct polygons
    grouped by POLY_ID. The polygons are defined in UTM coordinates
    (X_UTME, Y_UTMN, Z_TVDSS).
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "PolygonsAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_polygons_directory_async(self) -> List[PolygonsMeta]:
        realizations = await self._ensemble_context.realizationids_async

        polygons_context = self._ensemble_context.polygons.filter(
            realization=realizations[0],
        )

        poly_meta_arr: list[PolygonsMeta] = []
        sumo_polygons_object: Polygons
        async for sumo_polygons_object in polygons_context:
            poly_meta = _create_polygons_meta_from_sumo_polygons_object(sumo_polygons_object)
            if poly_meta is not None:
                poly_meta_arr.append(poly_meta)

        return poly_meta_arr

    async def get_polygons_async(self, real_num: int, name: str, attribute: str) -> list[PolygonData]:
        """
        Get polygons data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        poly_context = _filter_search_context_on_attribute(self._ensemble_context.polygons, attribute)
        poly_context = poly_context.filter(
            realization=real_num,
            name=name,
        )

        polygons_count = await poly_context.length_async()
        if polygons_count == 0:
            raise NoDataError(f"No polygons found in Sumo for: {addr_str}", service=Service.SUMO)

        is_valid = False

        if polygons_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple ({polygons_count}) polygons set found in Sumo for: {addr_str}. There should only be one.",
                service=Service.SUMO,
            )

        sumo_polys = await poly_context.getitem_async(0)
        poly_df = await sumo_polys.to_pandas_async()

        if all(col in poly_df.columns for col in ["X_UTME", "Y_UTMN", "Z_TVDSS", "POLY_ID"]):
            is_valid = True

        # Keep backward compatibility for older datasets
        if all(col in poly_df.columns for col in ["X", "Y", "Z", "ID"]):
            poly_df = poly_df.rename(columns={"X": "X_UTME", "Y": "Y_UTMN", "Z": "Z_TVDSS", "ID": "POLY_ID"})
            is_valid = True

        if not is_valid:
            raise InvalidDataError(
                f"Invalid polygons data found in Sumo for: {addr_str}. Expected columns ['X_UTME', 'Y_UTMN', 'Z_TVDSS', 'POLY_ID'], got {poly_df.columns.tolist()}",
                service=Service.SUMO,
            )

        polydata: list[PolygonData] = []
        has_name = "NAME" in poly_df.columns
        for poly_id, pol_dframe in poly_df.groupby("POLY_ID"):
            # Pick up individual polygons name from the data if it exist, if not encourage users to provide it!
            name = pol_dframe["NAME"].iloc[0] if has_name else "NO_NAME_IN_METADATA"
            polydata.append(
                PolygonData(
                    x_arr=pol_dframe["X_UTME"].tolist(),
                    y_arr=pol_dframe["Y_UTMN"].tolist(),
                    z_arr=pol_dframe["Z_TVDSS"].tolist(),
                    poly_id=poly_id,
                    name=name,
                )
            )

        LOGGER.debug(f"Got surface polygons from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return polydata

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._ensemble_name}__C:{self._case_uuid}"
        return addr_str


def _create_polygons_meta_from_sumo_polygons_object(sumo_polygons_object: Polygons) -> PolygonsMeta | None:
    content = sumo_polygons_object["data"].get("content", SumoContent.DEPTH)

    polygons_metadata = sumo_polygons_object["data"]
    if content == "unset" or content is None:
        LOGGER.warning(f"Polygons {polygons_metadata['name']} has unset content. Ignoring the polygon.")

    attribute = None
    standard_result_name = polygons_metadata.get("standard_result", {}).get("name")
    if standard_result_name:
        attribute = f"{standard_result_name} (standard result)"
    else:
        attribute = polygons_metadata.get("tagname", None)
        if not attribute:
            LOGGER.warning(
                f"Polygons {polygons_metadata['name']} is not a standard_result and has empty tagname. Ignoring the polygon",
            )
    if not attribute:
        return None
    polygons_meta = PolygonsMeta(
        name=sumo_polygons_object["data"]["name"],
        tagname=attribute,
        content=content,
        is_stratigraphic=sumo_polygons_object["data"]["stratigraphic"],
    )
    return polygons_meta


def _filter_search_context_on_attribute(search_context: SearchContext, attribute: str) -> SearchContext:
    """Adds "attribute" filter to an existing search context. Attribute can be either a tagname or a standard result.
    This is a temporary solution until standard_results are fully supported in dataio and webviz"""

    if attribute.endswith(" (standard result)"):
        standard_result = attribute.removesuffix(" (standard result)")
        return search_context.filter(
            standard_result=standard_result,
        )
    return search_context.filter(
        tagname=attribute,
    )
