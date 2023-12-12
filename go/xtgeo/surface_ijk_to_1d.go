package xtgeo

import (
	"errors"
)

// IndexOrder represents the indexing order (Fortran or C order).
type IndexOrder int

const (
	FortranOrder IndexOrder = iota // Fortran order (column major)
	COrder                         // C order (row major)
)

// SurfaceIJKTo1D converts (i, j, k) coordinates to a 1-dimensional index based on the specified order.
func SurfaceIJKTo1D(i, j, k, nx, ny, nz int, iaStart int, order IndexOrder) (int, error) {
	if i < 1 || i > nx || j < 1 || j > ny || k < 1 || k > nz {
		return -2, errors.New("indices are out of range")
	}

	var index int
	switch order {
	case FortranOrder:
		// Fortran order (column major order: i loops fastest, then j, then k)
		index = (k-1)*nx*ny + (j-1)*nx + i
	case COrder:
		// C order (row major order: k loops fastest, then j, then i)
		// Provbably not needed.
		index = (i-1)*nz*ny + (j-1)*nz + k
	default:
		return -2, errors.New("unknown index order")
	}

	if iaStart == 0 {
		index--
	}

	return index, nil
}
