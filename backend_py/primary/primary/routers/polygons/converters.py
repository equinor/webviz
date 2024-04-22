from typing import List
import xtgeo

from primary.services.smda_access.types import StratigraphicSurface
from primary.services.sumo_access.polygons_types import PolygonsMeta as SumoPolygonsMeta

from . import schemas


def to_api_polygons_data(xtgeo_poly: xtgeo.Polygons) -> List[schemas.PolygonData]:
    """
    Create API PolygonsData from xtgeo polygons
    """
    polydata: List[schemas.PolygonData] = []
    for poly_id, polygon in xtgeo_poly.dataframe.groupby("POLY_ID"):
        polydata.append(
            schemas.PolygonData(
                x_arr=list(polygon.X_UTME),
                y_arr=list(polygon.Y_UTMN),
                z_arr=list(polygon.Z_TVDSS),
                poly_id=poly_id,
            )
        )
    return polydata


def to_api_polygons_directory(
    sumo_polygons_dir: List[SumoPolygonsMeta], stratigraphical_names: List[StratigraphicSurface]
) -> List[schemas.PolygonsMeta]:
    """
    Convert Sumo polygons directory to API surface directory
    """

    polygons_metas = _sort_by_stratigraphical_order(sumo_polygons_dir, stratigraphical_names)
    return polygons_metas


def _sort_by_stratigraphical_order(
    sumo_polygons_metas: List[SumoPolygonsMeta], stratigraphic_surfaces: List[StratigraphicSurface]
) -> List[schemas.PolygonsMeta]:
    """Sort the Sumo polygons meta list by the order they appear in the stratigraphic column.
    Non-stratigraphical polygons are appended at the end of the list."""

    polygons_metas_with_official_strat_name = []
    polygons_metas_with_custom_names = []

    for strat_surface in stratigraphic_surfaces:
        for sumo_polygons_meta in sumo_polygons_metas:
            if sumo_polygons_meta.name == strat_surface.name:
                polygons_meta = schemas.PolygonsMeta(
                    name=sumo_polygons_meta.name,
                    name_is_stratigraphic_offical=True,
                    relative_stratigraphic_level=strat_surface.relative_strat_unit_level,
                    parent_stratigraphic_identifier=strat_surface.strat_unit_parent,
                    stratigraphic_identifier=strat_surface.strat_unit_identifier,
                    attribute_name=sumo_polygons_meta.tagname,
                    attribute_type=schemas.PolygonsAttributeType(sumo_polygons_meta.content.value),
                )
                polygons_metas_with_official_strat_name.append(polygons_meta)

    # Append non-official strat names
    for sumo_polygons_meta in sumo_polygons_metas:
        if sumo_polygons_meta.name not in [s.name for s in polygons_metas_with_official_strat_name]:
            polygons_meta = schemas.PolygonsMeta(
                name=sumo_polygons_meta.name,
                name_is_stratigraphic_offical=False,
                relative_stratigraphic_level=None,
                parent_stratigraphic_identifier=None,
                stratigraphic_identifier=None,
                attribute_name=sumo_polygons_meta.tagname,
                attribute_type=schemas.PolygonsAttributeType(sumo_polygons_meta.content.value),
            )

            polygons_metas_with_custom_names.append(polygons_meta)

    return polygons_metas_with_official_strat_name + polygons_metas_with_custom_names
