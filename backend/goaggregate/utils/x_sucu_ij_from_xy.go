package utils

import (
	"math"
)

const (
	Pi          = math.Pi
	FloatEps    = 0.5 // Assuming a definition for FLOATEPS
	ExitSuccess = 0
)

func XSucuIJFromXY(xin, yin, xori, xinc, yori, yinc float64, nx, ny, yflip int, rotDeg float64, flag int) (i, j int, rx, ry float64, errCode int) {
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
	_, _, _, relx, ierx := XPointLinePos(x1, y1, 0.0, x2, y2, 0.0, xin, yin, 0.0, option2)

	// Determine relative coordinate on Y axis
	_, _, _, rely, iery := XPointLinePos(x1, y1, 0.0, x3, y3, 0.0, xin, yin, 0.0, option2)

	if ierx == -1 || iery == -1 {
		return 0, 0, 0.0, 0.0, -1
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

	return ipos, jpos, px, py, ExitSuccess
}
