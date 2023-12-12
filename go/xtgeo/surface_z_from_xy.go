package xtgeo

import "fmt"

type InterpolationAlgorithm int

const (
	NearestNeighbor InterpolationAlgorithm = iota
	Bilinear
)

func SurfaceZFromXY(x, y float32, nx, ny int, xori, yori, xinc, yinc float32, yflip int, rotDeg float32, pMapV []float32, nn int64, algo InterpolationAlgorithm) float32 {
	var i, j int
	var rx, ry float32

	// Get i and j for lower left corner, given a point X Y
	i, j, rx, ry, err := SurfaceIJFromXY(x, y, xori, xinc, yori, yinc, nx, ny, yflip, rotDeg, 1)

	// Outside map, returning UNDEF value
	if err != nil {
		fmt.Println("Error in SurfaceZFromXY: ", err)
		return Undef
	}

	var z float32

	// switch algo {
	// case NearestNeighbor:
	z, err = SurfaceZFromIJ(i, j, rx, ry, xinc, yinc*float32(yflip), 0.0, 0.0, nx, ny, pMapV, algo)
	if err != nil {
		fmt.Println("Error in SurfaceZFromXY: ", err)
		return Undef
	}
	// case Bilinear:
	// z, err = SurfaceZFromIJ(i, j, rx, ry, xinc, yinc*float32(yflip), 0.0, 0.0, nx, ny, pMapV, 0)

	// default:
	// z, err = SurfaceZFromIJ(i, j, rx, ry, xinc, yinc*float32(yflip), 0.0, 0.0, nx, ny, pMapV, 1)
	// }
	return z
}
