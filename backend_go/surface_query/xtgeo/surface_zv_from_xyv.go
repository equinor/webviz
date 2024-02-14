// https://github.com/equinor/xtgeo/blob/896de3b466cce33fcbed7c1a6bdd09801d6ef16c/src/clib/xtg/surf_get_zv_from_xyv

package xtgeo

// Description:
//
// SurfaceZArrFromXYPairs is a function adapted from surf_get_z_from_xy.c in xtgeo.
//
// It is used to get the Z values from a surface given XY coordinates. Giving the same results as s.get_randomline() in Python.
// It is ported to go to speed up the process when intersecting many surfaces.
// The code here and underlying files have been ported more or less directly from the xtgeo source code.
// Parameters:
//
//	xv, yv []float32 - Arrays of XY coordinates.
//	nx, ny int      - Surface dimensions
//	xori, yori float32 - Surface origin
//	xinc, yinc float32 - Surface increment
//	yflip int       - Direction of the Y axis (1 for normal, -1 for flipped).
//	rotDeg float32  - Rotation angle of the surface  in degrees.
//	pMapV []float32 - Slice of the surface values.
//	option InterpolationAlgorithm - Interpolation/sampling option:
//	                  Bilinear
//	                  NearestNeighbor
//
// Returns:
//
//	zv []float32 - Array to store the interpolated or sampled Z values.
//	err error    - An error, if any occurred during the processing.
func SurfaceZArrFromXYPairs(xv []float64, yv []float64, nx, ny int, xori, yori, xinc, yinc float64, yflip int, rotDeg float64, pMapV []float32, algo InterpolationAlgorithm) ([]float32, error) {
	zv := make([]float32, len(xv))

	for i, x := range xv {
		if i < len(yv) {

			zv[i] = SurfaceZFromXY(x, yv[i], nx, ny, xori, yori, xinc, yinc, yflip, rotDeg, pMapV, int64(nx*ny), algo)
		}
	}
	return zv, nil
}
