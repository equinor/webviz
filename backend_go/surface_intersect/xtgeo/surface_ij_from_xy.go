package xtgeo

import (
	"errors"
	"math"
)

// calculateRotatedCoordinates computes the coordinates of a grid after rotation.
func calculateRotatedCoordinates(xinc, yinc float32, nx, ny int, angle float32) (float32, float32, float32, float32) {
	x2 := xinc * float32(nx-1) * float32(math.Cos(float64(angle)))
	y2 := xinc * float32(nx-1) * float32(math.Sin(float64(angle)))
	x3 := yinc * float32(ny-1) * float32(math.Cos(float64(angle+math.Pi/2.0)))
	y3 := yinc * float32(ny-1) * float32(math.Sin(float64(angle+math.Pi/2.0)))
	return x2, y2, x3, y3
}

// Function to adjust input coordinates
func adjustInputCoordinates(xin, yin, xori, yori float32) (float32, float32) {
	xin -= xori
	yin -= yori
	return xin, yin
}

// Functions to determine relative coordinates
func determineRelativeCoordinate(x1, y1, x2, y2, xin, yin float32) (float32, int) {
	_, _, _, rel, ier := ProjectedPointOnLine(x1, y1, 0.0, x2, y2, 0.0, xin, yin, 0.0)
	return rel, ier
}

// Function to calculate new coordinates
func calculateNewCoordinates(relx, rely, xinc, yinc float32, nx, ny int) (float32, float32) {
	px := relx * xinc * float32(nx-1)
	py := rely * yinc * float32(ny-1)
	return px, py
}

// Function to determine position indices
func determinePositionIndices(px, py, xinc, yinc float32, flag int) (int, int) {
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
func SurfaceIJFromXY(xin, yin, xori, xinc, yori, yinc float32, nx, ny, yflip int, rotDeg float32, flag int) (int, int, float32, float32, error) {
	angle := rotDeg * float32(math.Pi) / 180.0
	yinc *= float32(yflip)

	x2, y2, x3, y3 := calculateRotatedCoordinates(xinc, yinc, nx, ny, angle)
	xin, yin = adjustInputCoordinates(xin, yin, xori, yori)

	relx, ierx := determineRelativeCoordinate(0, 0, x2, y2, xin, yin)
	rely, iery := determineRelativeCoordinate(0, 0, x3, y3, xin, yin)

	if ierx == -1 || iery == -1 {
		return 0, 0, 0.0, 0.0, errors.New("point is outside the surface")
	}

	px, py := calculateNewCoordinates(relx, rely, xinc, yinc, nx, ny)
	ipos, jpos := determinePositionIndices(px, py, xinc, yinc, flag)

	return ipos, jpos, px, py, nil
}
