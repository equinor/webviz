package xtgeo

import "fmt"

func SurfaceZFromIJ(ic, jc int, x, y, xinc, yinc, xori, yori float64, nx, ny int, pMapV []float64, option int) (float64, error) {
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

	iba, err := SurfaceIJKTo1D(ic, jc, 1, nx, ny, 1, 0, FortranOrder)
	if iba < 0 || err != nil {
		fmt.Println("Error in SurfaceZFromIJ: ", err)
		zV[0] = UndefMap
	} else {
		zV[0] = pMapV[iba]
	}

	ibb, err := SurfaceIJKTo1D(ic+1, jc, 1, nx, ny, 1, 0, FortranOrder)
	zV[1] = getValueOrPrevious(pMapV, ibb, iba)

	ibc, err := SurfaceIJKTo1D(ic, jc+1, 1, nx, ny, 1, 0, FortranOrder)
	zV[2] = getValueOrPrevious(pMapV, ibc, iba)

	ibd, err := SurfaceIJKTo1D(ic+1, jc+1, 1, nx, ny, 1, 0, FortranOrder)
	zV[3] = getValueOrPrevious(pMapV, ibd, iba)

	// TODO: Add billinear interpolation...
	if option == 1 {
		return SurfaceInterpolateNearestNode(xV[:], yV[:], zV[:], x, y), nil
	}
	return SurfaceInterpolateNearestNode(xV[:], yV[:], zV[:], x, y), nil

}

func getValueOrPrevious(pMapV []float64, index, previousIndex int) float64 {
	if index < 0 {
		return pMapV[previousIndex]
	}
	return pMapV[index]
}
