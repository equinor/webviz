package xtgeo

func XSurfGetZVFromXYV(xv []float64, yv []float64, nx, ny int, xori, yori, xinc, yinc float64, yflip int, rotDeg float64, pMapV []float64, option int) []float64 {
	zv := make([]float64, len(xv))

	for i, x := range xv {
		if i < len(yv) {
			zv[i] = XSurfGetZFromXY(x, yv[i], nx, ny, xori, yori, xinc, yinc, yflip, rotDeg, pMapV, int64(nx*ny), option)
		}
	}

	return zv
}
