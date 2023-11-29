// Xtgeo source: https://github.com/equinor/xtgeo/blob/main/src/clib/xtg/x_interp_map_nodes.c
// Todo: Add Tor`s function.
package xtgeo

func XInterpMapNearestNodes(xV, yV, zV []float64, x, y float64) float64 {
	xmin, ymin := UndefMap, UndefMap
	xmax, ymax := -UndefMap, -UndefMap
	z := 0.0

	for i := 0; i < 4; i++ {
		if xV[i] < xmin {
			xmin = xV[i]
		}
		if yV[i] < ymin {
			ymin = yV[i]
		}
		if xV[i] > xmax {
			xmax = xV[i]
		}
		if yV[i] > ymax {
			ymax = yV[i]
		}

	}
	if x < xmin || x > xmax || y < ymin || y > ymax {
		return UndefMap
	}

	for i := 0; i <= 3; i++ {
		if zV[i] > UndefMapLimit {
			return UndefMap
		}
	}

	previous := VeryLargeFloat
	z = UndefMap
	for i := 0; i < 4; i++ {
		len, _, _ := XVectorInfo2(x, xV[i], y, yV[i], 1)
		if len < previous {
			z = zV[i]
			previous = len
		}
	}

	return z
}
