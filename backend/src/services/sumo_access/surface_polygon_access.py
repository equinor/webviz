import logging
from io import BytesIO
from typing import List, Optional

import pandas as pd
import xtgeo
from fmu.sumo.explorer.objects import Case, CaseCollection, PolygonsCollection
from sumo.wrapper import SumoClient

from src.services.utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client_instance
from .surface_polygon_types import SurfacePolygonsDirectory
from .generic_types import SumoContent

LOGGER = logging.getLogger(__name__)


class SurfacePolygonsAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self._sumo_case_obj: Optional[Case] = None

    def get_surface_polygons_dir(self, content_filter: Optional[List[SumoContent]] = None) -> SurfacePolygonsDirectory:
        """
        Get a directory of surface polygon names and attributes.
        """
        timer = PerfTimer()

        LOGGER.debug("Getting data for surface polygon directory...")

        case = self._get_my_sumo_case_obj()

        polygons_collection: PolygonsCollection = case.polygons.filter(
            iteration=self._iteration_name,
            realization=0,
        )

        names = sorted(polygons_collection.names)
        attributes = sorted(polygons_collection.tagnames)

        if content_filter is not None:
            if not any(SumoContent.has(content) for content in content_filter):
                raise ValueError(f"Invalid content filter: {content_filter}")
            polygons_with_filtered_content = [
                surf for surf in polygons_collection if surf["data"]["content"] in content_filter
            ]
            for surf in polygons_collection:
                if surf["data"]["content"] in content_filter:
                    print(surf["data"]["content"])
            names = sorted(list(set(surf.name for surf in polygons_with_filtered_content)))
            attributes = sorted(list(set(surf.tagname for surf in polygons_with_filtered_content)))

        else:
            names = sorted(polygons_collection.names)
            attributes = sorted(polygons_collection.tagnames)

        LOGGER.debug(
            f"Build valid name/attribute combinations for surface polygons directory "
            f"(num names={len(names)}, num attributes={len(attributes)})..."
        )

        valid_attributes_for_name: List[List[int]] = []

        for name in names:
            filtered_coll = polygons_collection.filter(name=name)

            filtered_attributes = [tagname for tagname in filtered_coll.tagnames if tagname in attributes]
            attribute_indices: List[int] = []
            for attr in filtered_attributes:
                attr_idx = attributes.index(attr)
                attribute_indices.append(attr_idx)

            valid_attributes_for_name.append(attribute_indices)

        polygon_dir = SurfacePolygonsDirectory(
            names=names,
            attributes=attributes,
            valid_attributes_for_name=valid_attributes_for_name,
        )

        LOGGER.debug(f"Downloaded and built surface polygon directory in: {timer.elapsed_ms():}ms")

        return polygon_dir

    def get_surface_polygons(self, real_num: int, name: str, attribute: str) -> Optional[xtgeo.Polygons]:
        """
        Get polygons data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        case = self._get_my_sumo_case_obj()

        polygons_collection: PolygonsCollection = case.polygons.filter(
            iteration=self._iteration_name,
            realization=real_num,
            name=name,
            tagname=attribute,
        )

        surface_polygons_count = len(polygons_collection)
        if surface_polygons_count == 0:
            LOGGER.warning(f"No surface polygons found in Sumo for {addr_str}")
            return None

        is_valid = False
        byte_stream: BytesIO
        if surface_polygons_count > 1:
            LOGGER.warning(
                f"Multiple ({surface_polygons_count}) polygons set found in Sumo for: {addr_str}. Returning first polygons set."
            )
            # Some fields has multiple polygons set. There should only be one.
            for poly in polygons_collection:
                byte_stream = poly.blob
                poly_df = pd.read_csv(byte_stream)
                if set(["X_UTME", "Y_UTMN", "Z_TVDSS", "POLY_ID"]) == set(poly_df.columns):
                    is_valid = True
                    break
                if set(["X", "Y", "Z", "ID"]) == set(poly_df.columns):
                    poly_df = poly_df.rename(columns={"X": "X_UTME", "Y": "Y_UTMN", "Z": "Z_TVDSS", "ID": "POLY_ID"})
                    is_valid = True
                    break
        else:
            sumo_polys = polygons_collection[0]
            byte_stream = sumo_polys.blob
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

    def _get_my_sumo_case_obj(self) -> Case:
        """
        Get the Sumo case that we should be working on.
        Raises exception if case isn't found
        """
        if self._sumo_case_obj is None:
            case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
            if len(case_collection) != 1:
                raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

            self._sumo_case_obj = case_collection[0]

        return self._sumo_case_obj

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str
