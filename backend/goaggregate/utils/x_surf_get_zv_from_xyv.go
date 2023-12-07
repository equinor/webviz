package utils

// XSurfGetZVFromXYV computes Z values for arrays of X and Y coordinates.
func XSurfGetZVFromXYV(xv []float64, yv []float64, nx, ny int, xori, yori, xinc, yinc float64, yflip int, rotDeg float64, pMapV []float64, option int) []float64 {
	zv := make([]float64, len(xv))

	for i, x := range xv {
		if i < len(yv) {
			zv[i] = XSurfGetZFromXY(x, yv[i], nx, ny, xori, yori, xinc, yinc, yflip, rotDeg, pMapV, int64(nx*ny), option)
		}
	}
	// Print all arguments with names one by one
	// fmt.Printf("xv: %v\n", xv)
	// fmt.Printf("yv: %v\n", yv)
	// fmt.Printf("nx: %v\n", nx)
	// fmt.Printf("ny: %v\n", ny)
	// fmt.Printf("xori: %v\n", xori)
	// fmt.Printf("yori: %v\n", yori)
	// fmt.Printf("xinc: %v\n", xinc)
	// fmt.Printf("yinc: %v\n", yinc)
	// fmt.Printf("yflip: %v\n", yflip)
	// fmt.Printf("rotDeg: %v\n", rotDeg)
	// // fmt.Printf("pMapV: %v\n", pMapV)
	// fmt.Printf("option: %v\n", option)

	return zv
}

// // Print all arguments
// printf("surf_get_zv_from_xyv: %f %f %f %f %f %f %f %f %d %f %f %f %f %d %d %f %f %d\n",
//         xv[0], yv[0], zv[0], nxv, nyv, nzv, nx, ny, xori, yori, xinc, yinc, yflip,
//         rot_deg, p_map_v[0], nn, option);
