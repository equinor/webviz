package xtgeo

import (
	"errors"
	"math"
)

// SurfaceIJFromXY computes the indices (I, J) and relative coordinates (rx, ry)
// of a point in a rotated grid given its X, Y coordinates.
// Returns indices (I, J), relative coordinates (rx, ry), and an error.
func SurfaceIJFromXY(xin, yin, xori, xinc, yori, yinc float64, nx, ny, yflip int, rotDeg float64, flag int) (int, int, float64, float64, error) {

	angle := rotDeg * Pi / 180.0

	yinc = yinc * float64(yflip)

	// Actual corners
	x1, y1 := 0.0, 0.0
	x2 := xinc * float64(nx-1) * math.Cos(angle)
	y2 := xinc * float64(nx-1) * math.Sin(angle)
	x3 := yinc * float64(ny-1) * math.Cos(angle+Pi/2.0)
	y3 := yinc * float64(ny-1) * math.Sin(angle+Pi/2.0)

	xin -= xori
	yin -= yori

	// Determine relative coordinate on X axis
	option2 := 2
	_, _, _, relx, ierx := ProjectedPointOnLine(x1, y1, 0.0, x2, y2, 0.0, xin, yin, 0.0, option2)

	// Determine relative coordinate on Y axis
	_, _, _, rely, iery := ProjectedPointOnLine(x1, y1, 0.0, x3, y3, 0.0, xin, yin, 0.0, option2)

	if ierx == -1 || iery == -1 {
		return 0, 0, 0.0, 0.0, errors.New("point is outside the surface")
	}

	// New coordinates
	px := relx * xinc * float64(nx-1)
	py := rely * yinc * float64(ny-1)

	var ipos, jpos int
	if flag == 0 {
		// Find cell index
		ipos = int((px+0.5*xinc)/xinc) + 1
		jpos = int((py+0.5*yinc)/yinc) + 1
	} else {
		// Find nodes, which is the lower left index position
		ipos = int(px/xinc) + 1
		jpos = int(py/yinc) + 1
	}

	return ipos, jpos, px, py, nil
}
