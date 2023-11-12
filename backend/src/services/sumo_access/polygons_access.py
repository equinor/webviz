import logging
from io import BytesIO
from typing import List, Optional

import pandas as pd
import xtgeo
from fmu.sumo.explorer.objects import PolygonsCollection

from src.services.utils.perf_timer import PerfTimer

from ._helpers import SumoEnsemble
from .polygons_types import PolygonsMeta
from .generic_types import SumoContent

LOGGER = logging.getLogger(__name__)


class PolygonsAccess(SumoEnsemble):
    async def get_polygons_directory_async(self) -> List[PolygonsMeta]:
        polygons_collection: PolygonsCollection = self._case.polygons.filter(
            iteration=self._iteration_name,
            realization=self._case.get_realizations(iteration=self._iteration_name)[0],
        )

        polygons_arr: List[PolygonsMeta] = []
        async for polygons in polygons_collection:
            content = polygons["data"].get("content", SumoContent.DEPTH)

            # Remove this once Sumo enforces content (content-unset)
            # https://github.com/equinor/webviz/issues/433

            if content == "unset":
                LOGGER.info(
                    f"Polygons {polygons['data']['name']} has unset content. Defaulting temporarily to depth until enforced by dataio."
                )
                content = SumoContent.DEPTH

            # Remove this once Sumo enforces tagname (tagname-unset)
            # https://github.com/equinor/webviz/issues/433
            tagname = polygons["data"].get("tagname", "")
            if tagname == "":
                LOGGER.info(
                    f"Surface {polygons['data']['name']} has empty tagname. Defaulting temporarily to Unknown until enforced by dataio."
                )
                tagname = "Unknown"
            polygons_meta = PolygonsMeta(
                name=polygons["data"]["name"],
                tagname=tagname,
                content=content,
                is_stratigraphic=polygons["data"]["stratigraphic"],
            )
            polygons_arr.append(polygons_meta)
        return polygons_arr

    async def get_polygons_async(self, real_num: int, name: str, attribute: str) -> Optional[xtgeo.Polygons]:
        """
        Get polygons data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        polygons_collection: PolygonsCollection = self._case.polygons.filter(
            iteration=self._iteration_name,
            realization=real_num,
            name=name,
            tagname=attribute,
        )

        polygons_count = await polygons_collection.length_async()
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
            async for poly in polygons_collection:
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
            sumo_polys = await polygons_collection.getitem_async(0)
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
