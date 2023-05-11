from typing import Tuple, Optional
from dataclasses import dataclass
import numpy as np
import xtgeo
from vtkmodules.util.numpy_support import (
    numpy_to_vtk,
    numpy_to_vtkIdTypeArray,
    vtk_to_numpy,
)
from vtkmodules.vtkCommonCore import vtkPoints
from vtkmodules.vtkCommonDataModel import (
    vtkCellArray,
    vtkDataSetAttributes,
    vtkExplicitStructuredGrid,
    vtkPolyData,
)
from vtkmodules.vtkFiltersGeometry import vtkExplicitStructuredGridSurfaceFilter


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
    fill_value = np.nan if not xtgeo_grid_property.isdiscrete else -1
    raw_scalar_np = xtgeo_grid_property.values.ravel(order="F")
    raw_scalar_np.filled(fill_value)
    print("cell ids", cell_ids)
    if cell_ids is not None:
        return raw_scalar_np[cell_ids].astype(np.float32)
    return raw_scalar_np.astype(np.float32)
