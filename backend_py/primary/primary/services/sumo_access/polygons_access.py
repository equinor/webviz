import logging
from io import BytesIO
from typing import List, Optional
import pandas as pd
import xtgeo
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Polygons


from webviz_pkg.core_utils.perf_timer import PerfTimer

from .generic_types import SumoContent
from .polygons_types import PolygonsMeta
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class PolygonsAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "PolygonsAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_polygons_directory_async(self) -> List[PolygonsMeta]:
        realizations = await self._ensemble_context.realizationids_async

        polygons_context = self._ensemble_context.polygons.filter(
            realization=realizations[0],
        )

        poly_meta_arr: list[PolygonsMeta] = []
        sumo_polygons_object: Polygons
        async for sumo_polygons_object in polygons_context:
            poly_meta_arr.append(_create_polygons_meta_from_sumo_polygons_object(sumo_polygons_object))

        return poly_meta_arr

    async def get_polygons_async(self, real_num: int, name: str, attribute: str) -> Optional[xtgeo.Polygons]:
        """
        Get polygons data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        poly_context = self._ensemble_context.polygons.filter(
            realization=real_num,
            name=name,
            tagname=attribute,
        )

        polygons_count = await poly_context.length_async()
        if polygons_count == 0:
            LOGGER.warning(f"No surface polygons found in Sumo for {addr_str}")
            return None

        is_valid = False
        byte_stream: BytesIO
        if polygons_count > 1:
            LOGGER.warning(
                f"Multiple ({polygons_count}) polygons set found in Sumo for: {addr_str}. Returning first polygons set."
            )
            # Some fields has multiple polygons set. There should only be one.
            async for poly in poly_context:
                byte_stream = await poly.blob_async
                poly_df = pd.read_csv(byte_stream)
                if set(["X_UTME", "Y_UTMN", "Z_TVDSS", "POLY_ID"]) == set(poly_df.columns):
                    is_valid = True
                    break
                if set(["X", "Y", "Z", "ID"]) == set(poly_df.columns):
                    poly_df = poly_df.rename(columns={"X": "X_UTME", "Y": "Y_UTMN", "Z": "Z_TVDSS", "ID": "POLY_ID"})
                    is_valid = True
                    break
        else:
            sumo_polys = await poly_context.getitem_async(0)
            byte_stream = await sumo_polys.blob_async
            poly_df = pd.read_csv(byte_stream)
            if set(["X_UTME", "Y_UTMN", "Z_TVDSS", "POLY_ID"]) == set(poly_df.columns):
                is_valid = True

            if set(["X", "Y", "Z", "ID"]) == set(poly_df.columns):
                poly_df = poly_df.rename(columns={"X": "X_UTME", "Y": "Y_UTMN", "Z": "Z_TVDSS", "ID": "POLY_ID"})
                is_valid = True

        if not is_valid:
            LOGGER.warning(f"Invalid surface polygons found in Sumo for {addr_str}")
            return None
        xtgeo_polygons = xtgeo.Polygons(poly_df)

        LOGGER.debug(f"Got surface polygons from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_polygons

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str


def _create_polygons_meta_from_sumo_polygons_object(sumo_polygons_object: Polygons) -> PolygonsMeta:
    content = sumo_polygons_object["data"].get("content", SumoContent.DEPTH)

    # Remove this once Sumo enforces content (content-unset)
    # https://github.com/equinor/webviz/issues/433

    if content == "unset":
        LOGGER.warning(
            f"Polygons {sumo_polygons_object['data']['name']} has unset content. Defaulting temporarily to depth until enforced by dataio."
        )
        content = SumoContent.DEPTH

    # Remove this once Sumo enforces tagname (tagname-unset)
    # https://github.com/equinor/webviz/issues/433
    tagname = sumo_polygons_object["data"].get("tagname", "")
    if tagname == "":
        LOGGER.warning(
            f"Surface {sumo_polygons_object['data']['name']} has empty tagname. Defaulting temporarily to Unknown until enforced by dataio."
        )
        tagname = "Unknown"
    polygons_meta = PolygonsMeta(
        name=sumo_polygons_object["data"]["name"],
        tagname=tagname,
        content=content,
        is_stratigraphic=sumo_polygons_object["data"]["stratigraphic"],
    )
    return polygons_meta
