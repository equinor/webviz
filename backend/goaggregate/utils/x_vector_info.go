package utils

import (
	"math"
)

func XVectorInfo2(x1, x2, y1, y2 float64, option int) (vlen, xangleRadian, xangleDegrees float64) {
	const epsilon = 0.00001
	const pi = math.Pi

	// Initial checks
	if x1 == x2 && y1 == y2 {
		return 0.000001, 0.0, 0.0
	}

	// Compute vector length
	vlen = math.Sqrt(math.Pow(x2-x1, 2) + math.Pow(y2-y1, 2))

	if option == -1 {
		return vlen, 0.0, 0.0
	}

	var azi, deg float64

	if math.Abs(x2-x1) > epsilon {
		deg = math.Atan((y2 - y1) / (x2 - x1))

		if x2 > x1 {
			azi = pi/2 - deg
		} else {
			deg += pi
			azi = 2*pi + pi/2 - deg
		}
	} else {
		if y2 < y1 {
			azi = pi
			deg = -pi / 2.0
		} else {
			azi = 0
			deg = pi / 2
		}
	}

	azi = adjustAngle(azi)
	deg = adjustAngle(deg)

	xangleRadian = azi
	if option == 1 {
		xangleRadian = deg
	}
	xangleDegrees = xangleRadian * 180 / pi

	return vlen, xangleRadian, xangleDegrees
}

func adjustAngle(angle float64) float64 {
	const pi = math.Pi
	if angle < 0 {
		return angle + 2*pi
	}
	if angle > 2*pi {
		return angle - 2*pi
	}
	return angle
}
