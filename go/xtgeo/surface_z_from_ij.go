package xtgeo

import (
	"fmt"
)

// calculateNodeValues calculates the xV and yV values for the nodes.
func calculateNodeValues(ic, jc int, xinc, yinc, xori, yori float32) ([4]float32, [4]float32) {
	var xV, yV [4]float32
	xV[0] = xori + float32(ic-1)*xinc
	xV[1] = xori + float32(ic)*xinc
	xV[2] = xV[0]
	xV[3] = xV[1]
	yV[0] = yori + float32(jc-1)*yinc
	yV[1] = yV[0]
	yV[2] = yori + float32(jc)*yinc
	yV[3] = yV[2]
	return xV, yV
}

// getZValues retrieves the z values for the nodes.
func getZValues(ic, jc, nx, ny int, pMapV []float32) ([4]float32, error) {
	var zV [4]float32
	var err error
	iba, err := SurfaceIJKTo1D(ic, jc, 1, nx, ny, 1, 0, FortranOrder)
	if iba < 0 || err != nil {
		fmt.Println("Error in getZValues (interpolation): ", err)
		zV[0] = UndefMap
	} else {
		zV[0] = pMapV[iba]
	}

	ibb, _ := SurfaceIJKTo1D(ic+1, jc, 1, nx, ny, 1, 0, FortranOrder)
	zV[1] = getValueOrPrevious(pMapV, ibb, iba)

	ibc, _ := SurfaceIJKTo1D(ic, jc+1, 1, nx, ny, 1, 0, FortranOrder)
	zV[2] = getValueOrPrevious(pMapV, ibc, iba)

	ibd, _ := SurfaceIJKTo1D(ic+1, jc+1, 1, nx, ny, 1, 0, FortranOrder)
	zV[3] = getValueOrPrevious(pMapV, ibd, iba)

	return zV, nil
}

// SurfaceZFromIJ calculates the Z value from IJ coordinates using either bilinear or nearest node.
func SurfaceZFromIJ(ic, jc int, x, y, xinc, yinc, xori, yori float32, nx, ny int, pMapV []float32, algo InterpolationAlgorithm) (float32, error) {
	xV, yV := calculateNodeValues(ic, jc, xinc, yinc, xori, yori)
	zV, err := getZValues(ic, jc, nx, ny, pMapV)
	if err != nil {
		return 0, err
	}

	switch algo {
	case NearestNeighbor:
		return SurfaceInterpolateNearestNode(xV[:], yV[:], zV[:], x, y), nil
	case Bilinear:
		return SurfaceInterpolateBilinear(xV[:], yV[:], zV[:], x, y), nil
	default:
		return SurfaceInterpolateNearestNode(xV[:], yV[:], zV[:], x, y), nil
	}
}

// getValueOrPrevious returns the value from pMapV at the specified index or previous index if invalid.
func getValueOrPrevious(pMapV []float32, index, previousIndex int) float32 {
	if index < 0 {
		return pMapV[previousIndex]
	}
	return pMapV[index]
}
