package xtgeo

import (
	"errors"
	"math"
)

// xPointLineDist calculates the distance from a point to a line or line segment.
// Arguments:
// x1, y1, z1: Defining point 1 on the line
// x2, y2, z2: Defining point 2 on the line
// x3, y3, z3: Defining point 3 outside the line
// option1: Options flag:
//
//	0 = infinite line,
//	1 = segment (distance will "bend" around ends),
//	2 = segment and return error if outside
//
// option2: Options flag:
//
//	0 = distance positive always,
//	1 = positive if right side, negative if left
//
// Returns: distance and error. The error is nil upon success, otherwise it indicates an issue.
func DistanceBetweenPointAndLine(x1, y1, z1, x2, y2, z2, x3, y3, z3 float32, option1, option2 int) (float32, error) {
	var sign, u, dlen, x0, y0, z0 float32

	// Check if the two points form a line
	if x1 == x2 && y1 == y2 && z1 == z2 {
		return 0, errors.New("the two points form no line (error 1)")
	}

	// Length of segment
	dlen = float32(math.Sqrt(float64(math.Pow(float64(x2-x1), 2) + math.Pow(float64(y2-y1), 2) + math.Pow(float64(z2-z1), 2))))

	if dlen < 1e-20 {
		return 0, errors.New("the 1 to 2 vector is too short (error 3)")
	}

	// Find u
	u = ((x3-x1)*(x2-x1) + (y3-y1)*(y2-y1) + (z3-z1)*(z2-z1)) / float32(math.Pow(float64(dlen), 2))
	if option1 == 2 && (u < 0 || u > 1) {
		return 0, errors.New("the point is outside the segment (error -1)")
	}

	if option1 == 1 {
		if u < 0 {
			u = 0
		}
		if u > 1 {
			u = 1
		}
	}

	// This gives the point on the line (or segment)
	x0 = x1 + u*(x2-x1)
	y0 = y1 + u*(y2-y1)
	z0 = z1 + u*(z2-z1)

	// The actual distance
	dlen = float32(math.Sqrt(float64(math.Pow(float64(x3-x0), 2) + math.Pow(float64(y3-y0), 2) + math.Pow(float64(z3-z0), 2))))

	// Give sign according to side seen in XY plane
	sign = 0
	if option2 == 1 {
		if x2 > x1 {
			if y3 >= y0 {
				sign = 1
			}
			if y3 < y0 {
				sign = -1
			}
		} else if x2 < x1 {
			if y3 >= y0 {
				sign = -1
			}
			if y3 < y0 {
				sign = 1
			}
		} else {
			if x3 >= x0 {
				sign = 1
			}
			if x3 < x0 {
				sign = -1
			}
		}
		dlen = dlen * sign
	}

	return dlen, nil
}
