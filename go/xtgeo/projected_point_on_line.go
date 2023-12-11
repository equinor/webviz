// // Xtgeo source: https://github.com/equinor/xtgeo/blob/896de3b466cce33fcbed7c1a6bdd09801d6ef16c/src/clib/xtg/x_3d_geom2.c
// * DESCRIPTION:
// *    Projected XYZ on line between a point and a line (3D)
// *    Based on: http://paulbourke.net/geometry/pointlineplane/
// *
// * ARGUMENTS:
// *    x1, y1, z1     i     Defining point 1 on the line
// *    x2, y2, z2     i     Defining point 2 on the line
// *    x3, y3, z3     i     Defining point 3 outside the line
// *    x, y, z        o     The projected point coordinate
// *    rel            o     Relative position (from p1) if segment
// *    option1        i     Options flag1:
// *                             0 = infinite line,
// *                             1 = segment
// *                             2 = segment, allow for numerical precision
// *    debug          i     Debug level
// *
// * RETURNS:
// *    Function: 0: upon success. If problems:
// *              1: the two points 1 and 2 are the same (forms no line)
// *              2: the input points forms a line
// *              3: the 1 --> 2 vector is too short
// *             -1: The point is outside the segment (given option1 = 1 or 2)
// *    Result pointers are updated.
// *
package xtgeo

import (
	"math"
)

const floatEps = 1.0e-05

func ProjectedPointOnLine(x1, y1, z1, x2, y2, z2, x3, y3, z3 float64, option1 int) (x, y, z, rel float64, errCode int) {
	// Check if the two points form no line
	if x1 == x2 && y1 == y2 && z1 == z2 {
		return 0, 0, 0, 0, 1
	}

	// Length of segment
	dlen := math.Sqrt(math.Pow(x2-x1, 2) + math.Pow(y2-y1, 2) + math.Pow(z2-z1, 2))
	if dlen < floatEps {
		return 0, 0, 0, 0, 3
	}

	// Find u
	u := (((x3 - x1) * (x2 - x1)) + ((y3 - y1) * (y2 - y1)) + ((z3 - z1) * (z2 - z1))) / math.Pow(dlen, 2)

	if option1 == 1 && (u < 0 || u > 1) {
		return 0, 0, 0, 0, -1
	}

	if option1 == 2 {
		if u < -floatEps || u > 1+floatEps {
			return 0, 0, 0, 0, -1
		}
		if u < 0 {
			u = floatEps
		}
		if u > 1 {
			u = 1 - floatEps
		}
	}

	// This gives the point on the line (or segment)
	x = x1 + u*(x2-x1)
	y = y1 + u*(y2-y1)
	z = z1 + u*(z2-z1)

	// The actual relative distance
	rellen := math.Sqrt(math.Pow(x1-x, 2) + math.Pow(y1-y, 2) + math.Pow(z1-z, 2))
	fullen := math.Sqrt(math.Pow(x1-x2, 2) + math.Pow(y1-y2, 2) + math.Pow(z1-z2, 2))

	rel = rellen / fullen

	return x, y, z, rel, 0
}
