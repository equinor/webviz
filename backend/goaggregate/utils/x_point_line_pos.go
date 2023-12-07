package utils

import (
	"math"
)

const floatEps = 1.0e-05

func XPointLinePos(x1, y1, z1, x2, y2, z2, x3, y3, z3 float64, option1 int) (x0, y0, z0, rel float64, errCode int) {
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
	x0 = x1 + u*(x2-x1)
	y0 = y1 + u*(y2-y1)
	z0 = z1 + u*(z2-z1)

	// The actual relative distance
	rellen := math.Sqrt(math.Pow(x1-x0, 2) + math.Pow(y1-y0, 2) + math.Pow(z1-z0, 2))
	fullen := math.Sqrt(math.Pow(x1-x2, 2) + math.Pow(y1-y2, 2) + math.Pow(z1-z2, 2))

	rel = rellen / fullen

	return x0, y0, z0, rel, 0
}
