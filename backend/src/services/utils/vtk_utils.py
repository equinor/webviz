# pylint: skip-file
# type: ignore
# for now
from typing import Optional, List
from dataclasses import dataclass
import numpy as np
import xtgeo

# pylint: disable=no-name-in-module,
from vtkmodules.util.numpy_support import (
    numpy_to_vtk,
    numpy_to_vtkIdTypeArray,
    vtk_to_numpy,
)

# pylint: disable=no-name-in-module,
from vtkmodules.vtkCommonCore import vtkPoints

# pylint: disable=no-name-in-module,
from vtkmodules.vtkCommonDataModel import (
    vtkCellArray,
    vtkDataSetAttributes,
    vtkExplicitStructuredGrid,
    vtkUnstructuredGrid,
    vtkPolyData,
    vtkPlane,
)

# pylint: disable=no-name-in-module,
from vtkmodules.vtkFiltersCore import (
    vtkAppendPolyData,
    vtkClipPolyData,
    vtkExplicitStructuredGridCrop,
    vtkExplicitStructuredGridToUnstructuredGrid,
    vtkExtractCellsAlongPolyLine,
    vtkPlaneCutter,
    vtkUnstructuredGridToExplicitStructuredGrid,
)

# pylint: disable=no-name-in-module,
from vtkmodules.vtkFiltersGeometry import vtkExplicitStructuredGridSurfaceFilter

# pylint: disable=no-name-in-module,
from vtkmodules.vtkFiltersSources import vtkPolyLineSource


@dataclass
class VtkGridSurface:
    polydata: vtkPolyData
    original_cell_ids: np.ndarray


def _create_vtk_esgrid_from_verts_and_conn(
    point_dims: np.ndarray, vertex_arr_np: np.ndarray, conn_arr_np: np.ndarray
) -> vtkExplicitStructuredGrid:
    vertex_arr_np = vertex_arr_np.reshape(-1, 3)
    points_vtkarr = numpy_to_vtk(vertex_arr_np, deep=1)
    vtk_points = vtkPoints()
    vtk_points.SetData(points_vtkarr)

    conn_idarr = numpy_to_vtkIdTypeArray(conn_arr_np, deep=1)
    vtk_cell_array = vtkCellArray()
    vtk_cell_array.SetData(8, conn_idarr)

    vtk_esgrid = vtkExplicitStructuredGrid()
    vtk_esgrid.SetDimensions(point_dims)
    vtk_esgrid.SetPoints(vtk_points)
    vtk_esgrid.SetCells(vtk_cell_array)

    vtk_esgrid.ComputeFacesConnectivityFlagsArray()

    return vtk_esgrid


def xtgeo_grid_to_vtk_explicit_structured_grid(
    xtg_grid: xtgeo.Grid,
) -> vtkExplicitStructuredGrid:
    # Create geometry data suitable for use with VTK's explicit structured grid
    # based on the specified xtgeo 3d grid
    pt_dims, vertex_arr, conn_arr, inactive_arr = xtg_grid.get_vtk_esg_geometry_data()
    vertex_arr[:, 2] *= -1

    vtk_esgrid = _create_vtk_esgrid_from_verts_and_conn(pt_dims, vertex_arr, conn_arr)

    # Make sure we hide the inactive cells.
    # First we let VTK allocate cell ghost array, then we obtain a numpy view
    # on the array and write to that (we're actually modifying the native VTK array)
    ghost_arr_vtk = vtk_esgrid.AllocateCellGhostArray()
    ghost_arr_np = vtk_to_numpy(ghost_arr_vtk)
    ghost_arr_np[inactive_arr] = vtkDataSetAttributes.HIDDENCELL

    return vtk_esgrid


def _calc_grid_surface(esgrid: vtkExplicitStructuredGrid) -> vtkPolyData:
    surf_filter = vtkExplicitStructuredGridSurfaceFilter()
    surf_filter.SetInputData(esgrid)
    surf_filter.PassThroughCellIdsOn()
    surf_filter.Update()

    polydata: vtkPolyData = surf_filter.GetOutput()
    return polydata


def get_surface(
    xtgeo_grid: xtgeo.Grid,
) -> VtkGridSurface:
    es_grid = xtgeo_grid_to_vtk_explicit_structured_grid(xtgeo_grid)
    polydata = _calc_grid_surface(es_grid)

    original_cell_indices_np = vtk_to_numpy(polydata.GetCellData().GetAbstractArray("vtkOriginalCellIds"))
    return VtkGridSurface(polydata=polydata, original_cell_ids=original_cell_indices_np)


def get_scalar_values(xtgeo_grid_property: xtgeo.GridProperty, cell_ids: Optional[np.ndarray] = None) -> np.ndarray:
    fill_value = 0.0 if not xtgeo_grid_property.isdiscrete else -1
    raw_scalar_np = xtgeo_grid_property.values.ravel(order="F")
    raw_scalar_np.filled(fill_value)

    if cell_ids is not None:
        return raw_scalar_np[cell_ids].astype(np.float32)
    return raw_scalar_np.astype(np.float32)


def _vtk_esg_to_ug(vtk_esgrid: vtkExplicitStructuredGrid) -> vtkUnstructuredGrid:
    convert_filter = vtkExplicitStructuredGridToUnstructuredGrid()
    convert_filter.SetInputData(vtk_esgrid)
    convert_filter.Update()
    vtk_ugrid = convert_filter.GetOutput()

    return vtk_ugrid


def cut_along_polyline(
    esgrid: vtkExplicitStructuredGrid,
    polyline_xy: List[float],
) -> vtkPolyData:
    num_points_in_polyline = int(len(polyline_xy) / 2)

    ugrid = _vtk_esg_to_ug(esgrid)

    # !!!!!!!!!!!!!!
    # Requires VTK 9.2-ish
    # ugrid = _extract_intersected_ugrid(ugrid, polyline_xy, 10.0)

    cutter_alg = vtkPlaneCutter()
    cutter_alg.SetInputDataObject(ugrid)

    # cell_locator = vtkStaticCellLocator()
    # cell_locator.SetDataSet(esgrid)
    # cell_locator.BuildLocator()

    # box_clip_alg = vtkBoxClipDataSet()
    # box_clip_alg.SetInputDataObject(ugrid)

    append_alg = vtkAppendPolyData()

    et_cut_s = 0.0
    et_clip_s = 0.0

    for i in range(0, num_points_in_polyline - 1):
        x_0 = polyline_xy[2 * i]
        y_0 = polyline_xy[2 * i + 1]
        x_1 = polyline_xy[2 * (i + 1)]
        y_1 = polyline_xy[2 * (i + 1) + 1]
        fwd_vec = np.array([x_1 - x_0, y_1 - y_0, 0.0])
        fwd_vec /= np.linalg.norm(fwd_vec)
        right_vec = np.array([fwd_vec[1], -fwd_vec[0], 0])

        # box_clip_alg.SetBoxClip(x_0, x_1, y_0, y_1, min_z, max_z)
        # box_clip_alg.Update()
        # clipped_ugrid = box_clip_alg.GetOutputDataObject(0)

        # polyline_bounds = _calc_polyline_bounds([x_0, y_0, x_1, y_1])
        # polyline_bounds.extend([min_z, max_z])
        # cell_ids = vtkIdList()
        # cell_locator.FindCellsWithinBounds(polyline_bounds, cell_ids)
        # print(f"{cell_ids.GetNumberOfIds()}  {polyline_bounds=}")

        plane = vtkPlane()
        plane.SetOrigin([x_0, y_0, 0])
        plane.SetNormal(right_vec)

        plane_0 = vtkPlane()
        plane_0.SetOrigin([x_0, y_0, 0])
        plane_0.SetNormal(fwd_vec)

        plane_1 = vtkPlane()
        plane_1.SetOrigin([x_1, y_1, 0])
        plane_1.SetNormal(-fwd_vec)

        cutter_alg.SetPlane(plane)
        cutter_alg.Update()

        cut_surface_polydata = cutter_alg.GetOutput()
        # print(f"{type(cut_surface_polydata)=}")

        # Used vtkPolyDataPlaneClipper earlier, but it seems that it doesn't
        # maintain the original cell IDs that we need for the result mapping.
        # May want to check up on any performance degradation!
        clipper_0 = vtkClipPolyData()
        clipper_0.SetInputDataObject(cut_surface_polydata)
        clipper_0.SetClipFunction(plane_0)
        clipper_0.Update()
        clipped_polydata = clipper_0.GetOutput()

        clipper_1 = vtkClipPolyData()
        clipper_1.SetInputDataObject(clipped_polydata)
        clipper_1.SetClipFunction(plane_1)
        clipper_1.Update()
        clipped_polydata = clipper_1.GetOutput()

        append_alg.AddInputData(clipped_polydata)

    append_alg.Update()
    comb_polydata = append_alg.GetOutput()
    return comb_polydata


def flatten_sliced_grid(sliced_grid: vtkPolyData, polyline, original_cell_ids) -> vtkPolyData:
    """Flatten the sliced grid to a 2D grid."""
    points = sliced_grid.GetPoints()
    num_points = points.GetNumberOfPoints()
    flattened_points = vtkPoints()

    for i in range(num_points):
        point = np.array(points.GetPoint(i))
        min_dist = float("inf")
        closest_point = np.array(polyline.GetPoint(0))[:2]
        for j in range(polyline.GetNumberOfPoints() - 1):
            p1 = np.array(polyline.GetPoint(j))[:2]
            p2 = np.array(polyline.GetPoint(j + 1))[:2]
            segment = p2 - p1
            segment_length = np.linalg.norm(segment)
            segment_normalized = segment / segment_length
            projection = np.dot(point[:2] - p1, segment_normalized)
            if 0 <= projection <= segment_length:
                projected_point = p1 + projection * segment_normalized
                dist = np.linalg.norm(point[:2] - projected_point)
                if dist < min_dist:
                    min_dist = dist
                    closest_point = projected_point

        flattened_points.InsertNextPoint(
            (
                np.linalg.norm(closest_point - np.array(polyline.GetPoint(0))[:2]),
                point[2],
                0,
            )
        )

    flattened_grid = vtkPolyData()
    flattened_grid.SetPoints(flattened_points)
    flattened_grid.SetPolys(sliced_grid.GetPolys())

    # Transfer original cell IDs to the flattened grid
    original_cell_ids_array = numpy_to_vtk(np.array(original_cell_ids))
    flattened_grid.GetCellData().AddArray(original_cell_ids_array)
    flattened_grid.GetCellData().GetAbstractArray(0).SetName("vtkOriginalCellIds")

    return flattened_grid


def get_triangles(poly_data) -> List[List[int]]:
    triangles = []
    num_cells = poly_data.GetNumberOfCells()
    for i in range(num_cells):
        cell = poly_data.GetCell(i)
        if cell.GetNumberOfPoints() == 3:
            triangles.append([cell.GetPointId(0), cell.GetPointId(1), cell.GetPointId(2)])
    return triangles


def create_polyline(polyline: List[List[float]]):
    points = vtkPoints()
    for point in polyline:
        points.InsertNextPoint(point)
        points.InsertNextPoint(point)
        points.InsertNextPoint(point)
        points.InsertNextPoint(point)
        points.InsertNextPoint(point)

    polyline = vtkPolyLineSource()
    polyline.SetPoints(points)

    polyline.Update()
    return polyline.GetOutput()


def create_planes(polyline):
    num_points = polyline.GetNumberOfPoints()
    planes = []

    for i in range(num_points - 1):
        p1 = polyline.GetPoint(i)
        p2 = polyline.GetPoint(i + 1)
        normal = [p2[1] - p1[1], -(p2[0] - p1[0]), 0]
        plane = vtkPlane()
        plane.SetOrigin(p1)
        plane.SetNormal(normal)
        planes.append(plane)

    return planes


def grid_to_numpy(flattened_grid):
    points = flattened_grid.GetPoints()
    num_points = points.GetNumberOfPoints()
    coords = np.zeros((num_points, 2))

    for i in range(num_points):
        coords[i, 0], coords[i, 1], _ = points.GetPoint(i)

    return coords
