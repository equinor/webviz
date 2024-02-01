// Xtgeo source: https://github.com/equinor/xtgeo/blob/896de3b466cce33fcbed7c1a6bdd09801d6ef16c/src/clib/xtg/x_vector_info.c

//  * DESCRIPTION:
//  *    Take 2 points in XY space and compute length and azimuth or normal angle
//  *    Angles shall be in range 0-360 degrees (no negative angles)
//  *
//  * ARGUMENTS:
//  *    x1 ... y2        i     Points
//  *    vlen             o     Length (2D, XY space)
//  *    xangle_radian    o     Angle, radians
//  *    xangle_degrees   o     Angle, degrees
//  *    option           i     -1: No angle computation (increase speed)
//  *                            0: azimuth returned,
//  *                            1: angle (aka school) is returned
//  *
//  * RETURNS by pointers:
//  *    Option -1, Lengths only
//  *    Option  0, Lengths + AZIMUTH is returned (clockwise, releative to North)
//  *    Option  1, Lengths + ANGLE is returned (counter clockwise, relative to East)
//  *

// */
package xtgeo

import (
	"math"
)

func CalculateVectorLengthAndAngle(x1, x2, y1, y2 float64, option int) (vlen, xangleRadian, xangleDegrees float32) {
	const epsilon = 0.00001
	const pi = math.Pi

	// Initial checks
	if x1 == x2 && y1 == y2 {
		return 0.000001, 0.0, 0.0
	}

	// Compute vector length
	vlen = float32(math.Sqrt(float64(math.Pow(float64(x2-x1), 2) + math.Pow(float64(y2-y1), 2))))

	if option == -1 {
		return vlen, 0.0, 0.0
	}

	var azi, deg float32

	if math.Abs(float64(x2-x1)) > epsilon {
		deg = float32(math.Atan(float64((y2 - y1) / (x2 - x1))))

		if x2 > x1 {
			azi = float32(pi)/2 - deg
		} else {
			deg += float32(pi)
			azi = 2*float32(pi) + float32(pi)/2 - deg
		}
	} else {
		if y2 < y1 {
			azi = float32(pi)
			deg = -float32(pi) / 2.0
		} else {
			azi = 0
			deg = float32(pi) / 2
		}
	}

	azi = adjustAngle(azi)
	deg = adjustAngle(deg)

	xangleRadian = azi
	if option == 1 {
		xangleRadian = deg
	}
	xangleDegrees = xangleRadian * 180 / float32(pi)

	return vlen, xangleRadian, xangleDegrees
}

func adjustAngle(angle float32) float32 {
	const pi = math.Pi
	if angle < 0 {
		return angle + 2*float32(pi)
	}
	if angle > 2*float32(pi) {
		return angle - 2*float32(pi)
	}
	return angle
}
