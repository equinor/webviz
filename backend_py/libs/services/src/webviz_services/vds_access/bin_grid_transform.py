from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
from numpy.typing import NDArray

from webviz_services.service_exceptions import InvalidDataError, Service

from .response_types import VdsBoundingBox


@dataclass
class AffineTransform2d:
    """A 2D affine transform: [x, y] = matrix @ [u, v] + translation"""

    _matrix: NDArray[np.float64]  # [[a, b], [c, d]]
    _translation: NDArray[np.float64]  # [e, f]

    def forward(self, u: float, v: float) -> Tuple[float, float]:
        x, y = self._matrix @ np.array([u, v], dtype=np.float64) + self._translation
        return float(x), float(y)

    def inverse(self, x: float, y: float) -> Tuple[float, float]:
        u, v = np.linalg.solve(self._matrix, np.array([x, y], dtype=np.float64) - self._translation)
        return float(u), float(v)


def fit_affine_transform_2d(source_points: List[List[float]], target_points: List[List[float]]) -> AffineTransform2d:
    """Fit a 2D affine transform mapping `source_points` to `target_points` by least squares."""
    source = np.array(source_points, dtype=np.float64)
    target = np.array(target_points, dtype=np.float64)

    if source.shape[0] < 3 or source.shape != target.shape:
        raise InvalidDataError(
            f"Expected at least 3 matching source/target points, got source={source.shape}, target={target.shape}",
            Service.VDS,
        )

    # Solve [x, y] = [u, v, 1] @ [[a, c], [b, d], [e, f]] by least squares over all corners
    design_matrix = np.hstack([source, np.ones((source.shape[0], 1))])
    solution, *_ = np.linalg.lstsq(design_matrix, target, rcond=None)

    matrix = solution[:2, :].T
    translation = solution[2, :]

    return AffineTransform2d(_matrix=matrix, _translation=translation)


@dataclass
class SeismicBinGridTransform:
    """
    Transform between a VDS cube's 0-indexed (i, j) bin-grid coordinates and its UTM (x, y) and
    inline/crossline coordinate systems, fitted from the corner correspondences in a vds-slice
    bounding box.
    """

    _utm_transform: AffineTransform2d
    _il_xl_transform: AffineTransform2d
    _i_min: float
    _i_max: float
    _j_min: float
    _j_max: float

    def ij_to_utm_xy(self, i: float, j: float) -> Tuple[float, float]:
        return self._utm_transform.forward(i, j)

    def ij_to_inline_crossline(self, i: float, j: float) -> Tuple[int, int]:
        inline, crossline = self._il_xl_transform.forward(i, j)
        return round(inline), round(crossline)

    def utm_xy_to_nearest_ij(self, x: float, y: float) -> Tuple[int, int]:
        """Find the nearest integer (i, j) bin-grid indices for a UTM (x, y) point, clamped to the cube's extent."""
        i, j = self._utm_transform.inverse(x, y)
        clamped_i = min(max(round(i), self._i_min), self._i_max)
        clamped_j = min(max(round(j), self._j_min), self._j_max)
        return int(clamped_i), int(clamped_j)


def build_seismic_bin_grid_transform(bounding_box: VdsBoundingBox) -> SeismicBinGridTransform:
    """Build the (i, j) <-> (x, y) / (inline, crossline) transform from a vds-slice bounding box."""
    utm_transform = fit_affine_transform_2d(bounding_box.ij, bounding_box.cdp)
    il_xl_transform = fit_affine_transform_2d(bounding_box.ij, bounding_box.ilxl)

    ij_corners = np.array(bounding_box.ij, dtype=np.float64)
    i_min, j_min = ij_corners.min(axis=0)
    i_max, j_max = ij_corners.max(axis=0)

    return SeismicBinGridTransform(
        _utm_transform=utm_transform,
        _il_xl_transform=il_xl_transform,
        _i_min=i_min,
        _i_max=i_max,
        _j_min=j_min,
        _j_max=j_max,
    )
