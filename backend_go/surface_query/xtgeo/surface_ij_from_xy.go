package xtgeo

import (
	"errors"
	"math"
)

// calculateRotatedCoordinates computes the coordinates of a grid after rotation.
func calculateRotatedCoordinates(xinc, yinc float64, nx, ny int, angle float64) (float64, float64, float64, float64) {
	x2 := xinc * float64(nx-1) * math.Cos(float64(angle))
	y2 := xinc * float64(nx-1) * math.Sin(float64(angle))
	x3 := yinc * float64(ny-1) * math.Cos(float64(angle+math.Pi/2.0))
	y3 := yinc * float64(ny-1) * math.Sin(float64(angle+math.Pi/2.0))
	return x2, y2, x3, y3
}

// Function to adjust input coordinates
func adjustInputCoordinates(xin, yin, xori, yori float64) (float64, float64) {
	xin -= xori
	yin -= yori
	return xin, yin
}

// Functions to determine relative coordinates
func determineRelativeCoordinate(x1, y1, x2, y2, xin, yin float64) (float64, int) {
	_, _, _, rel, ier := ProjectedPointOnLine(x1, y1, 0.0, x2, y2, 0.0, xin, yin, 0.0)
	return rel, ier
}

// Function to calculate new coordinates
func calculateNewCoordinates(relx, rely, xinc, yinc float64, nx, ny int) (float64, float64) {
	px := relx * xinc * float64(nx-1)
	py := rely * yinc * float64(ny-1)
	return px, py
}

// Function to determine position indices
func determinePositionIndices(px, py, xinc, yinc float64, flag int) (int, int) {
	var ipos, jpos int
	if flag == 0 {
		ipos = int((px+0.5*xinc)/xinc) + 1
		jpos = int((py+0.5*yinc)/yinc) + 1
	} else {
		ipos = int(px/xinc) + 1
		jpos = int(py/yinc) + 1
	}
	return ipos, jpos
}

// SurfaceIJFromXY computes the indices (I, J) and relative coordinates (rx, ry) of a point in a rotated grid.
// Returns the grid indices (I, J), new coordinates (rx, ry), and an error if the point is outside the grid.
func SurfaceIJFromXY(xin, yin float64, xori, xinc, yori, yinc float64, nx, ny, yflip int, rotDeg float64, flag int) (int, int, float64, float64, error) {
	angle := rotDeg * math.Pi / 180.0
	yinc *= float64(yflip)

	x2, y2, x3, y3 := calculateRotatedCoordinates(xinc, yinc, nx, ny, angle)
	xin, yin = adjustInputCoordinates(xin, yin, xori, yori)

	relx, ierx := determineRelativeCoordinate(0, 0, float64(x2), float64(y2), xin, yin)
	rely, iery := determineRelativeCoordinate(0, 0, float64(x3), float64(y3), xin, yin)

	if ierx == -1 || iery == -1 {
		return 0, 0, 0.0, 0.0, errors.New("point is outside the surface")
	}

	px, py := calculateNewCoordinates(relx, rely, xinc, yinc, nx, ny)
	ipos, jpos := determinePositionIndices(px, py, xinc, yinc, flag)
	return ipos, jpos, px, py, nil
}
