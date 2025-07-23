/**
 * A 3x3 matrix.
 *
 * The matrix is stored in column-major order.
 */
export type Mat3 = {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
    m20: number;
    m21: number;
    m22: number;
};

export function setRow(matrix: Mat3, rowIndex: number, x: number, y: number, z: number): Mat3 {
    switch (rowIndex) {
        case 0:
            return {
                ...matrix,
                m00: x,
                m01: y,
                m02: z,
            };
        case 1:
            return {
                ...matrix,
                m10: x,
                m11: y,
                m12: z,
            };
        case 2:
            return {
                ...matrix,
                m20: x,
                m21: y,
                m22: z,
            };
        default:
            throw new Error(`Invalid row index: ${rowIndex}`);
    }
}

export function setColumn(matrix: Mat3, columnIndex: number, x: number, y: number, z: number): Mat3 {
    switch (columnIndex) {
        case 0:
            return {
                ...matrix,
                m00: x,
                m10: y,
                m20: z,
            };
        case 1:
            return {
                ...matrix,
                m01: x,
                m11: y,
                m21: z,
            };
        case 2:
            return {
                ...matrix,
                m02: x,
                m12: y,
                m22: z,
            };
        default:
            throw new Error(`Invalid column index: ${columnIndex}`);
    }
}

export function transpose(matrix: Mat3) {
    matrix.m01 = matrix.m10;
    matrix.m02 = matrix.m20;
    matrix.m10 = matrix.m01;
    matrix.m12 = matrix.m21;
    matrix.m20 = matrix.m02;
    matrix.m21 = matrix.m12;
}

export function invert(matrix: Mat3) {
    const tmp: number[] = [];

    tmp[0] = matrix.m11 * matrix.m22 - matrix.m12 * matrix.m21;
    tmp[1] = matrix.m21 * matrix.m02 - matrix.m22 * matrix.m01;
    tmp[2] = matrix.m01 * matrix.m12 - matrix.m02 * matrix.m11;
    tmp[3] = matrix.m12 * matrix.m20 - matrix.m10 * matrix.m22;
    tmp[4] = matrix.m22 * matrix.m00 - matrix.m20 * matrix.m02;
    tmp[5] = matrix.m02 * matrix.m10 - matrix.m00 * matrix.m12;
    tmp[6] = matrix.m10 * matrix.m21 - matrix.m11 * matrix.m20;
    tmp[7] = matrix.m20 * matrix.m01 - matrix.m21 * matrix.m00;
    tmp[8] = matrix.m00 * matrix.m11 - matrix.m01 * matrix.m10;

    const det = matrix.m00 * tmp[0] + matrix.m01 * tmp[3] + matrix.m02 * tmp[6];

    if (det === 0) {
        throw new Error("Matrix is not invertible");
    }

    const invDet = 1.0 / det;

    matrix.m00 = tmp[0] * invDet;
    matrix.m01 = tmp[1] * invDet;
    matrix.m02 = tmp[2] * invDet;
    matrix.m10 = tmp[3] * invDet;
    matrix.m11 = tmp[4] * invDet;
    matrix.m12 = tmp[5] * invDet;
    matrix.m20 = tmp[6] * invDet;
    matrix.m21 = tmp[7] * invDet;
    matrix.m22 = tmp[8] * invDet;
}
