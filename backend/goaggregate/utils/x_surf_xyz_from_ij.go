package utils

import (
	"errors"
	"math"
)

const (
	Undef = 10e32 // Assuming UNDEF is a defined constant
)

func XSurfXYZFromIJ(i, j int, xori, xinc, yori, yinc float64, nx, ny, yflip int, rotDeg float64, pMapV []float64, nn int, flag int) (x, y, z float64, err error) {
	if i < 1 || i > nx || j < 1 || j > ny {
		if i == 0 {
			i = 1
		}
		if i == nx+1 {
			i = nx
		}
		if j == 0 {
			j = 1
		}
		if j == ny+1 {
			j = ny
		}

		if i < 1 || i > nx || j < 1 || j > ny {
			return 0.0, 0.0, Undef, errors.New("accessing value outside surface")
		}
	}

	ic := -1
	if flag == 0 {
		ic = XIJK2IC(i, j, 1, nx, ny, 1, 0) // C order
		if ic < 0 || ic >= nn {
			z = Undef
		} else {
			z = pMapV[ic]
		}
	} else {
		z = 999.00
	}

	if i == 1 && j == 1 {
		return xori, yori, z, nil
	}

	yinc *= float64(yflip)
	// Cube rotation
	angle := rotDeg * Pi / 180.0 // Radians, positive

	xdist := xinc * float64(i-1)
	ydist := yinc * float64(j-1)

	// Distance of point from "origo"
	dist := math.Sqrt(xdist*xdist + ydist*ydist)

	var beta float64
	if dist != 0 {
		beta = math.Acos(xdist / dist)
	}

	if beta < 0 || beta > Pi/2.0 || math.IsNaN(beta) {
		return 0.0, 0.0, 0.0, errors.New("unvalid value for beta in: surf_xyz_from_ij")
	}

	gamma := angle + float64(yflip)*beta // The difference in rotated coord system

	dxrot := dist * math.Cos(gamma)
	dyrot := dist * math.Sin(gamma)

	x = xori + dxrot
	y = yori + dyrot

	return x, y, z, nil
}

// xIJK2IC function needs to be defined as per your previous conversion.
