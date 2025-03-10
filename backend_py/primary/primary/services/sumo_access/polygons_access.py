import logging
from io import BytesIO
from typing import List, Optional
import asyncio
import pandas as pd
import xtgeo
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

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
        realizations = await self._ensemble_context.get_field_values_async("fmu.realization.id")

        polygons_context = self._ensemble_context.polygons.filter(
            realization=realizations[0],
        )
        length_polys = await polygons_context.length_async()
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(_get_polygons_meta_async(polygons_context, i)) for i in range(length_polys)]
        poly_meta_arr: list[PolygonsMeta] = [task.result() for task in tasks]

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


async def _get_polygons_meta_async(search_context: SearchContext, item_no: int) -> PolygonsMeta:
    polygons = await search_context.getitem_async(item_no)
    content = polygons["data"].get("content", SumoContent.DEPTH)

    # Remove this once Sumo enforces content (content-unset)
    # https://github.com/equinor/webviz/issues/433

    if content == "unset":
        LOGGER.warning(
            f"Polygons {polygons['data']['name']} has unset content. Defaulting temporarily to depth until enforced by dataio."
        )
        content = SumoContent.DEPTH

    # Remove this once Sumo enforces tagname (tagname-unset)
    # https://github.com/equinor/webviz/issues/433
    tagname = polygons["data"].get("tagname", "")
    if tagname == "":
        LOGGER.warning(
            f"Surface {polygons['data']['name']} has empty tagname. Defaulting temporarily to Unknown until enforced by dataio."
        )
        tagname = "Unknown"
    polygons_meta = PolygonsMeta(
        name=polygons["data"]["name"],
        tagname=tagname,
        content=content,
        is_stratigraphic=polygons["data"]["stratigraphic"],
    )
    return polygons_meta
