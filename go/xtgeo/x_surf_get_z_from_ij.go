package xtgeo

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

	// TODO: Add billinear interpolation...
	if option == 1 {
		return XInterpMapNearestNodes(xV[:], yV[:], zV[:], x, y)
	}
	return XInterpMapNearestNodes(xV[:], yV[:], zV[:], x, y)

}

func getValueOrPrevious(pMapV []float64, index, previousIndex int) float64 {
	if index < 0 {
		return pMapV[previousIndex]
	}
	return pMapV[index]
}
