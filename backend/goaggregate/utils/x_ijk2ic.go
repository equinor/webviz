package utils

func XIJK2IC(i, j, k, nx, ny, nz int, iaStart int) int {
	if i > nx || j > ny || k > nz || i < 1 || j < 1 || k < 1 {
		return -2
	}

	ic := (i-1)*nz*ny + (j-1)*nz + k
	// println("XIJK2IC: ic:", ic)
	if iaStart == 0 {
		ic--
	}

	return ic
}

func XIJK2IB(i, j, k, nx, ny, nz int, iaStart int) int {
	// Check if indices are out of bounds
	if i > nx || j > ny || k > nz || i < 1 || j < 1 || k < 1 {
		return -2
	}

	// Calculate the 1D index based on Fortran order counting (column-major order)
	ib := (k-1)*nx*ny + (j-1)*nx + i

	// Adjust the index if iaStart is 0
	if iaStart == 0 {
		ib--
	}

	return ib
}
