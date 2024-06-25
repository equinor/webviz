import numpy as np
import xtgeo
from numpy.typing import NDArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.services.smda_access.types import StratigraphicSurface
from primary.services.sumo_access.surface_types import SurfaceMetaSet
from primary.services.utils.surface_intersect_with_polyline import XtgeoSurfaceIntersectionPolyline
from primary.services.utils.surface_intersect_with_polyline import XtgeoSurfaceIntersectionResult
from primary.services.utils.surface_to_float32 import surface_to_float32_numpy_array

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


def to_api_surface_data(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceData:
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
