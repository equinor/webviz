package utils

func XSurfGetZFromIJ(ic, jc int, x, y, xinc, yinc, xori, yori float64, nx, ny int, pMapV []float64, option int) float64 {
	var xV, yV, zV [4]float64

	// Find the values of four nodes
	xV[0] = xori + float64(ic-1)*xinc
	xV[1] = xori + float64(ic)*xinc
	xV[2] = xori + float64(ic-1)*xinc
	xV[3] = xori + float64(ic)*xinc
	yV[0] = yori + float64(jc-1)*yinc
	yV[1] = yori + float64(jc-1)*yinc
	yV[2] = yori + float64(jc)*yinc
	yV[3] = yori + float64(jc)*yinc
	// fmt.Printf("XSurfGetZFromIJ: xV[0]: %v\n", xV[0])
	// fmt.Printf("XSurfGetZFromIJ: xV[1]: %v\n", xV[1])
	// fmt.Printf("XSurfGetZFromIJ: xV[2]: %v\n", xV[2])
	// fmt.Printf("XSurfGetZFromIJ: xV[3]: %v\n", xV[3])
	// fmt.Printf("XSurfGetZFromIJ: yV[0]: %v\n", yV[0])
	// fmt.Printf("XSurfGetZFromIJ: yV[1]: %v\n", yV[1])
	// fmt.Printf("XSurfGetZFromIJ: yV[2]: %v\n", yV[2])
	// fmt.Printf("XSurfGetZFromIJ: yV[3]: %v\n", yV[3])

	iba := XIJK2IB(ic, jc, 1, nx, ny, 1, 0)
	if iba < 0 {
		zV[0] = UndefMap
	} else {
		zV[0] = pMapV[iba]
	}

	ibb := XIJK2IB(ic+1, jc, 1, nx, ny, 1, 0)
	zV[1] = getValueOrPrevious(pMapV, ibb, iba)

	ibc := XIJK2IB(ic, jc+1, 1, nx, ny, 1, 0)
	zV[2] = getValueOrPrevious(pMapV, ibc, iba)

	ibd := XIJK2IB(ic+1, jc+1, 1, nx, ny, 1, 0)
	zV[3] = getValueOrPrevious(pMapV, ibd, iba)

	// printf("surf_get_z_from_ij: iba = %f\n", iba);
	// fmt.Printf("XSurfGetZFromIJ: iba: %v\n", iba)
	// fmt.Printf("XSurfGetZFromIJ: ibb: %v\n", ibb)
	// fmt.Printf("XSurfGetZFromIJ: ibc: %v\n", ibc)
	// fmt.Printf("XSurfGetZFromIJ: ibd: %v\n", ibd)
	// fmt.Printf("XSurfGetZFromIJ: zV[0]: %v\n", zV[0])
	// fmt.Printf("XSurfGetZFromIJ: zV[1]: %v\n", zV[1])
	// fmt.Printf("XSurfGetZFromIJ: zV[2]: %v\n", zV[2])
	// fmt.Printf("XSurfGetZFromIJ: zV[3]: %v\n", zV[3])

	// Now find the Z value, using interpolation method
	optInterp := 2
	if option == 1 {
		optInterp = 4
	}

	return XInterpMapNodes(xV[:], yV[:], zV[:], x, y, optInterp)
}

func getValueOrPrevious(pMapV []float64, index, previousIndex int) float64 {
	if index < 0 {
		return pMapV[previousIndex]
	}
	return pMapV[index]
}
