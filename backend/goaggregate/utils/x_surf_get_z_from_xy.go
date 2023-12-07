package utils

// Assuming sucuIJFromXY, surfGetZFromIJ, surfXYZFromIJ, and XInterpMapNodes are defined functions.

func XSurfGetZFromXY(x, y float64, nx, ny int, xori, yori, xinc, yinc float64, yflip int, rotDeg float64, pMapV []float64, nn int64, option int) float64 {
	var i, j int
	var rx, ry float64

	// Get i and j for lower left corner, given a point X Y
	i, j, rx, ry, ier := XSucuIJFromXY(x, y, xori, xinc, yori, yinc, nx, ny, yflip, rotDeg, 1)

	// Outside map, returning UNDEF value
	if ier < 0 {
		return Undef
	}

	var z float64

	if option == 0 {
		z = XSurfGetZFromIJ(i, j, rx, ry, xinc, yinc*float64(yflip), 0.0, 0.0, nx, ny, pMapV, 0)
		if z == -2 {
			return Undef
		}
	} else if option == 2 {
		z = XSurfGetZFromIJ(i, j, rx, ry, xinc, yinc*float64(yflip), 0.0, 0.0, nx, ny, pMapV, 1) // Nearest sampling
	}
	// Print z
	// fmt.Printf("XSurfGetZFromXY: %v\n", z)
	return z
}
