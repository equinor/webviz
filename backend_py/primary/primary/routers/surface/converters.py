import base64

import numpy as np
import xtgeo
from numpy.typing import NDArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.services.smda_access.types import StratigraphicSurface
from primary.services.sumo_access.surface_types import SurfaceMetaSet
from primary.services.utils.surface_intersect_with_polyline import XtgeoSurfaceIntersectionPolyline
from primary.services.utils.surface_intersect_with_polyline import XtgeoSurfaceIntersectionResult
from primary.services.utils.surface_to_float32 import surface_to_float32_numpy_array
from primary.services.utils.surface_to_png import surface_to_png_bytes_optimized

from . import schemas


def resample_to_surface_def(
    source_surface: xtgeo.RegularSurface, target_surface_def: schemas.SurfaceDef
) -> xtgeo.RegularSurface:
    """
    Returns resampled surface if the target surface definition differs from the grid definition of the source surface.
    If the grid definitions are equal, returns the source surface unmodified.
    """
    target_surface = xtgeo.RegularSurface(
        ncol=target_surface_def.npoints_x,
        nrow=target_surface_def.npoints_y,
        xinc=target_surface_def.inc_x,
        yinc=target_surface_def.inc_y,
        xori=target_surface_def.origin_utm_x,
        yori=target_surface_def.origin_utm_y,
        rotation=target_surface_def.rot_deg,
    )

    if target_surface.compare_topology(source_surface):
        return source_surface

    target_surface.resample(source_surface)
    return target_surface


def to_api_surface_data_float(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceDataFloat:
    """
    Create API SurfaceDataFloat from xtgeo regular surface
    """

    float32_np_arr: NDArray[np.float32] = surface_to_float32_numpy_array(xtgeo_surf)
    values_b64arr = b64_encode_float_array_as_float32(float32_np_arr)

    surface_def = schemas.SurfaceDef(
        npoints_x=xtgeo_surf.ncol,
        npoints_y=xtgeo_surf.nrow,
        inc_x=xtgeo_surf.xinc,
        inc_y=xtgeo_surf.yinc,
        origin_utm_x=xtgeo_surf.xori,
        origin_utm_y=xtgeo_surf.yori,
        rot_deg=xtgeo_surf.rotation,
    )

    trans_bb_utm = schemas.BoundingBox2d(
        min_x=xtgeo_surf.xmin, min_y=xtgeo_surf.ymin, max_x=xtgeo_surf.xmax, max_y=xtgeo_surf.ymax
    )

    return schemas.SurfaceDataFloat(
        format="float",
        surface_def=surface_def,
        transformed_bbox_utm=trans_bb_utm,
        value_min=xtgeo_surf.values.min(),
        value_max=xtgeo_surf.values.max(),
        values_b64arr=values_b64arr,
    )


def to_api_surface_data_png(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceDataPng:
    """
    Create API SurfaceDataPng from xtgeo regular surface
    """

    png_bytes: bytes = surface_to_png_bytes_optimized(xtgeo_surf)
    png_bytes_base64 = base64.b64encode(png_bytes).decode("ascii")

    surface_def = schemas.SurfaceDef(
        npoints_x=xtgeo_surf.ncol,
        npoints_y=xtgeo_surf.nrow,
        inc_x=xtgeo_surf.xinc,
        inc_y=xtgeo_surf.yinc,
        origin_utm_x=xtgeo_surf.xori,
        origin_utm_y=xtgeo_surf.yori,
        rot_deg=xtgeo_surf.rotation,
    )

    trans_bb_utm = schemas.BoundingBox2d(
        min_x=xtgeo_surf.xmin, min_y=xtgeo_surf.ymin, max_x=xtgeo_surf.xmax, max_y=xtgeo_surf.ymax
    )

    return schemas.SurfaceDataPng(
        format="png",
        surface_def=surface_def,
        transformed_bbox_utm=trans_bb_utm,
        value_min=xtgeo_surf.values.min(),
        value_max=xtgeo_surf.values.max(),
        png_image_base64=png_bytes_base64,
    )


def to_api_surface_meta_set(
    sumo_surf_meta_set: SurfaceMetaSet, ordered_stratigraphic_surfaces: list[StratigraphicSurface]
) -> schemas.SurfaceMetaSet:
    """
    Convert surface metadata directory from Sumo access layer to API surface directory
    At the same time, we build a list of the surface names ordered by stratigraphy where the names of
    non-stratigraphic surfaces is appended at the end of the list (in alphabetical order).
    """
    api_meta_arr: list[schemas.SurfaceMeta] = []
    all_sumo_surf_names: set[str] = set()
    stratigraphic_sumo_surf_names: set[str] = set()
    for sumo_surf in sumo_surf_meta_set.surfaces:
        api_meta_arr.append(
            schemas.SurfaceMeta(
                name=sumo_surf.name,
                name_is_stratigraphic_offical=sumo_surf.is_stratigraphic,
                attribute_name=sumo_surf.attribute_name,
                attribute_type=schemas.SurfaceAttributeType.from_sumo_content(sumo_surf.content),
                time_type=schemas.SurfaceTimeType(sumo_surf.time_type.value),
                is_observation=sumo_surf.is_observation,
                value_min=sumo_surf.global_min_val,
                value_max=sumo_surf.global_max_val,
            )
        )

        all_sumo_surf_names.add(sumo_surf.name)
        if sumo_surf.is_stratigraphic:
            stratigraphic_sumo_surf_names.add(sumo_surf.name)

    names_ordered_by_stratigraphy: list[str] = []
    for strat_surf in ordered_stratigraphic_surfaces:
        if strat_surf.name in stratigraphic_sumo_surf_names:
            names_ordered_by_stratigraphy.append(strat_surf.name)

    remaining_sumo_surf_names: set[str] = all_sumo_surf_names.difference(names_ordered_by_stratigraphy)
    remaining_names_sorted: list[str] = sorted(remaining_sumo_surf_names)

    return schemas.SurfaceMetaSet(
        surfaces=api_meta_arr,
        time_points_iso_str=sumo_surf_meta_set.time_points_iso_str,
        time_intervals_iso_str=sumo_surf_meta_set.time_intervals_iso_str,
        surface_names_in_strat_order=names_ordered_by_stratigraphy + remaining_names_sorted,
    )


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
