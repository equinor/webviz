package xtgeo

import (
	"fmt"
)

// findBounds calculates min and max bounds for x and y coordinates.
func findBounds(xV, yV []float64) (xmin, ymin, xmax, ymax float64) {
	xmin, ymin = UndefMap, UndefMap
	xmax, ymax = -UndefMap, -UndefMap

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
	return
}

// isPointInsideBounds checks if the point x, y is inside the given bounds.
func isPointInsideBounds(x, y, xmin, xmax, ymin, ymax float64) bool {
	return !(x < xmin || x > xmax || y < ymin || y > ymax)
}

// calculateRelativePositions computes the relative positions a and b.
func calculateRelativePositions(x, y float64, xV, yV []float64) (a, b float32) {
	a = float32((x - xV[0]) / (xV[1] - xV[0]))
	b = float32((y - yV[0]) / (yV[2] - yV[0]))
	return
}

// Description:
// Find the Z value by bilinear interpolation
// within a set of 4 map nodes.
// The routine assumes that the point is inside the nodes given by x_v,
// y_v, and z_v. Returns UndefMap if outside.
//
// Parameters:
//
//	x_v, y_v, z_v  []float32    Coordinates for XYZ, 4 corners
//	x, y            float32      Point to find Z for
//
// Returns:
//
//	Z value
func SurfaceInterpolateBilinear(xV, yV []float64, zV []float32, x, y float64) float32 {
	xmin, ymin, xmax, ymax := findBounds(xV, yV)

	if !isPointInsideBounds(x, y, xmin, xmax, ymin, ymax) {
		fmt.Println("Error in SurfaceInterpolateBilinear: x or y is outside the nodes")
		fmt.Println(x, y, xmin, xmax, ymin, ymax)
		return UndefMap
	}
	// /* assume that all nodes are defined (this need to be better...?) */
	// for (i = 0; i <= 3; i++) {
	//     if (z_v[i] > UNDEF_MAP_LIMIT) {
	//         return UNDEF_MAP;
	//     }
	// }
	for i := 0; i <= 3; i++ {
		if zV[i] >= UndefMap {
			fmt.Println("Error in SurfaceInterpolateNearestNode: zV[i] is undefined")
			return UndefMap
		}
	}
	a, b := calculateRelativePositions(x, y, xV, yV)

	z := zV[0] + a*(zV[1]-zV[0]) + b*(zV[2]-zV[0]) + a*b*(zV[3]+zV[0]-zV[2]-zV[1])

	return z
}

// Description:
// Find the Z value by snapping to the nearest node
// within a set of 4 map nodes.
// The routine assumes that the point is inside the nodes given by x_v,
// y_v, and z_v. Returns UndefMap if outside.
//
// Parameters:
//
//	x_v, y_v, z_v  []float32    Coordinates for XYZ, 4 corners
//	x, y            float32      Point to find Z for
//
// Returns:
//
//	Z value
func SurfaceInterpolateNearestNode(xV, yV []float64, zV []float32, x, y float64) float32 {
	xmin, ymin, xmax, ymax := findBounds(xV, yV)

	if !isPointInsideBounds(x, y, xmin, xmax, ymin, ymax) {
		fmt.Println("Error in SurfaceInterpolateNearestNode: x or y is outside the bounds")
		fmt.Println(x, y, xmin, xmax, ymin, ymax)
		return UndefMap
	}
	// /* assume that all nodes are defined (this need to be better...?) */
	// for (i = 0; i <= 3; i++) {
	//     if (z_v[i] > UNDEF_MAP_LIMIT) {
	//         return UNDEF_MAP;
	//     }
	// }
	for i := 0; i <= 3; i++ {
		if zV[i] >= UndefMap {
			fmt.Println("Error in SurfaceInterpolateNearestNode: zV[i] is undefined")
			return UndefMap
		}
	}

	var previous float64 = UndefMap
	var z float32 = UndefMap
	for i := 0; i < 4; i++ {
		len, _, _ := CalculateVectorLengthAndAngle(x, xV[i], y, yV[i], 1)
		if len < previous {
			z = zV[i]
			previous = len
		}
	}

	return z
}
