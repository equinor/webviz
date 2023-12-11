// https://github.com/equinor/xtgeo/blob/896de3b466cce33fcbed7c1a6bdd09801d6ef16c/src/clib/xtg/surf_get_zv_from_xyv
package xtgeo

func SurfaceZArrFromXYPairs(xv []float64, yv []float64, nx, ny int, xori, yori, xinc, yinc float64, yflip int, rotDeg float64, pMapV []float64, algo InterpolationAlgorithm) ([]float64, error) {
	zv := make([]float64, len(xv))

	for i, x := range xv {
		if i < len(yv) {
			zv[i] = SurfaceZFromXY(x, yv[i], nx, ny, xori, yori, xinc, yinc, yflip, rotDeg, pMapV, int64(nx*ny), algo)
		}
	}
	return zv, nil
}
