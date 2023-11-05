from typing import List
import base64

import numpy as np
import xtgeo
from numpy.typing import NDArray

from src.services.smda_access.types import StratigraphicSurface
from src.services.sumo_access.surface_types import SurfaceMeta as SumoSurfaceMeta
from src.services.sumo_access.surface_types import XtgeoSurfaceIntersectionPolyline, XtgeoSurfaceIntersectionResult
from src.services.utils.b64 import b64_encode_float_array_as_float32
from src.services.utils.surface_to_float32 import surface_to_float32_numpy_array
from src.services.utils.surface_to_png import surface_to_png_bytes_optimized
from src.services.utils.surface_orientation import calc_surface_orientation_for_colormap_layer

from . import schemas


def resample_property_surface_to_mesh_surface(
    mesh_surface: xtgeo.RegularSurface, property_surface: xtgeo.RegularSurface
) -> xtgeo.RegularSurface:
    """
    Regrid property surface to mesh surface if topology is different
    """
    if mesh_surface.compare_topology(property_surface):
        return property_surface

    mesh_surface.resample(property_surface)
    return mesh_surface


def to_api_surface_data_as_float32(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceData:
    """
    Create API SurfaceData from xtgeo regular surface
    """

    float32_np_arr: NDArray[np.float32] = surface_to_float32_numpy_array(xtgeo_surf)
    values_b64arr = b64_encode_float_array_as_float32(float32_np_arr)

    return schemas.SurfaceData(
        x_ori=xtgeo_surf.xori,
        y_ori=xtgeo_surf.yori,
        x_count=xtgeo_surf.ncol,
        y_count=xtgeo_surf.nrow,
        x_inc=xtgeo_surf.xinc,
        y_inc=xtgeo_surf.yinc,
        x_min=xtgeo_surf.xmin,
        x_max=xtgeo_surf.xmax,
        y_min=xtgeo_surf.ymin,
        y_max=xtgeo_surf.ymax,
        val_min=xtgeo_surf.values.min(),
        val_max=xtgeo_surf.values.max(),
        rot_deg=xtgeo_surf.rotation,
        values_b64arr=values_b64arr,
    )


def to_api_surface_data_as_png(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceDataPng:
    """
    Create API SurfaceData from xtgeo regular surface
    """

    png_bytes: bytes = surface_to_png_bytes_optimized(xtgeo_surf)
    base64_data = base64.b64encode(png_bytes).decode("ascii")

    surf_orient = calc_surface_orientation_for_colormap_layer(xtgeo_surf)

    return schemas.SurfaceDataPng(
        x_min_surf_orient=surf_orient.x_min,
        x_max_surf_orient=surf_orient.x_max,
        y_min_surf_orient=surf_orient.y_min,
        y_max_surf_orient=surf_orient.y_max,
        x_min=xtgeo_surf.xmin,
        x_max=xtgeo_surf.xmax,
        y_min=xtgeo_surf.ymin,
        y_max=xtgeo_surf.ymax,
        val_min=xtgeo_surf.values.min(),
        val_max=xtgeo_surf.values.max(),
        rot_deg=surf_orient.rot_around_xmin_ymax_deg,
        base64_encoded_image=f"{base64_data}",
    )


def to_api_surface_directory(
    sumo_surface_dir: List[SumoSurfaceMeta], stratigraphical_names: List[StratigraphicSurface]
) -> List[schemas.SurfaceMeta]:
    """
    Convert Sumo surface directory to API surface directory
    """

    surface_metas = _sort_by_stratigraphical_order(sumo_surface_dir, stratigraphical_names)
    return surface_metas


def _sort_by_stratigraphical_order(
    sumo_surface_metas: List[SumoSurfaceMeta], stratigraphic_surfaces: List[StratigraphicSurface]
) -> List[schemas.SurfaceMeta]:
    """Sort the Sumo surface meta list by the order they appear in the stratigraphic column.
    Non-stratigraphical surfaces are appended at the end of the list."""

    surface_metas_with_official_strat_name = []
    surface_metas_with_custom_names = []

    for strat_surface in stratigraphic_surfaces:
        for sumo_surface_meta in sumo_surface_metas:
            if sumo_surface_meta.name == strat_surface.name:
                surface_meta = schemas.SurfaceMeta(
                    name=sumo_surface_meta.name,
                    is_observation=sumo_surface_meta.is_observation,
                    iso_date_or_interval=sumo_surface_meta.iso_date_or_interval,
                    value_min=sumo_surface_meta.zmin,
                    value_max=sumo_surface_meta.zmax,
                    name_is_stratigraphic_offical=True,
                    stratigraphic_feature=strat_surface.feature,
                    relative_stratigraphic_level=strat_surface.relative_strat_unit_level,
                    parent_stratigraphic_identifier=strat_surface.strat_unit_parent,
                    stratigraphic_identifier=strat_surface.strat_unit_identifier,
                    attribute_name=sumo_surface_meta.tagname,
                    attribute_type=schemas.SurfaceAttributeType(sumo_surface_meta.content.value),
                )
                surface_metas_with_official_strat_name.append(surface_meta)

    # Append non-official strat names
    for sumo_surface_meta in sumo_surface_metas:
        if sumo_surface_meta.name not in [s.name for s in surface_metas_with_official_strat_name]:
            surface_meta = schemas.SurfaceMeta(
                name=sumo_surface_meta.name,
                is_observation=sumo_surface_meta.is_observation,
                iso_date_or_interval=sumo_surface_meta.iso_date_or_interval,
                value_min=sumo_surface_meta.zmin,
                value_max=sumo_surface_meta.zmax,
                name_is_stratigraphic_offical=False,
                stratigraphic_feature=None,
                relative_stratigraphic_level=None,
                parent_stratigraphic_identifier=None,
                stratigraphic_identifier=None,
                attribute_name=sumo_surface_meta.tagname,
                attribute_type=schemas.SurfaceAttributeType(sumo_surface_meta.content.value),
            )

            surface_metas_with_custom_names.append(surface_meta)

    return surface_metas_with_official_strat_name + surface_metas_with_custom_names


def from_api_cumulative_length_polyline_to_xtgeo_polyline(
    cumulative_length_polyline: schemas.SurfaceIntersectionCumulativeLengthPolyline,
) -> XtgeoSurfaceIntersectionPolyline:
    """
    Convert API cumulative length polyline to the polyline for xtgeo
    """
    return XtgeoSurfaceIntersectionPolyline(
        X=cumulative_length_polyline.x_points,
        Y=cumulative_length_polyline.y_points,
        Z=np.zeros(len(cumulative_length_polyline.x_points)).tolist(),
        HLEN=cumulative_length_polyline.cum_lengths,
    )


def to_api_surface_intersection(
    xtgeo_surface_intersection: XtgeoSurfaceIntersectionResult,
) -> schemas.SurfaceIntersectionData:
    """
    Convert a surface intersection to API surface intersection
    """

    return schemas.SurfaceIntersectionData(
        name=xtgeo_surface_intersection.name,
        z_points=xtgeo_surface_intersection.zval,
        cum_lengths=xtgeo_surface_intersection.distance,
    )
