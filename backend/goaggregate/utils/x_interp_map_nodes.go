package utils

const (
	UndefMapLimit  = 9.9e32
	UndefMap       = 10e32
	VeryLargeFloat = 10e30
)

func XInterpMapNodes(xV, yV, zV []float64, x, y float64, method int) float64 {
	xmin, ymin := UndefMap, UndefMap
	xmax, ymax := -UndefMap, -UndefMap
	z := 0.0
	// fmt.Printf("XInterpMapNodes: xV: %v\n", xV)
	// fmt.Printf("XInterpMapNodes: yV: %v\n", yV)
	// fmt.Printf("XInterpMapNodes: zV: %v\n", zV)
	// fmt.Printf("XInterpMapNodes: x: %v\n", x)
	// fmt.Printf("XInterpMapNodes: y: %v\n", y)
	// fmt.Printf("XInterpMapNodes: method: %v\n", method)

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
