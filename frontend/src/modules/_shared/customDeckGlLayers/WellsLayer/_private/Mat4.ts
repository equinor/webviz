import * as vec3 from "@lib/utils/vec3";

import * as mat3 from "./Mat3";

const EPSILON = 0.00001;

/**
 * A 4x4 matrix.
 *
 * The matrix is stored in column-major order.
 *
 */
export type Mat4 = {
    m00: number;
    m01: number;
    m02: number;
    m03: number;
    m10: number;
    m11: number;
    m12: number;
    m13: number;
    m20: number;
    m21: number;
    m22: number;
    m23: number;
    m30: number;
    m31: number;
    m32: number;
    m33: number;
};

export function identity(): Mat4 {
    return {
        m00: 1,
        m01: 0,
        m02: 0,
        m03: 0,
        m10: 0,
        m11: 1,
        m12: 0,
        m13: 0,
        m20: 0,
        m21: 0,
        m22: 1,
        m23: 0,
        m30: 0,
        m31: 0,
        m32: 0,
        m33: 1,
    };
}

export function setRow(matrix: Mat4, rowIndex: number, x: number, y: number, z: number, w: number): Mat4 {
    switch (rowIndex) {
        case 0:
            return {
                ...matrix,
                m00: x,
                m01: y,
                m02: z,
                m03: w,
            };
        case 1:
            return {
                ...matrix,
                m10: x,
                m11: y,
                m12: z,
                m13: w,
            };
        case 2:
            return {
                ...matrix,
                m20: x,
                m21: y,
                m22: z,
                m23: w,
            };
        case 3:
            return {
                ...matrix,
                m30: x,
                m31: y,
                m32: z,
                m33: w,
            };
        default:
            return matrix;
    }
}

export function setColumn(matrix: Mat4, columnIndex: number, x: number, y: number, z: number, w: number): Mat4 {
    switch (columnIndex) {
        case 0:
            return {
                ...matrix,
                m00: x,
                m10: y,
                m20: z,
                m30: w,
            };
        case 1:
            return {
                ...matrix,
                m01: x,
                m11: y,
                m21: z,
                m31: w,
            };
        case 2:
            return {
                ...matrix,
                m02: x,
                m12: y,
                m22: z,
                m32: w,
            };
        case 3:
            return {
                ...matrix,
                m03: x,
                m13: y,
                m23: z,
                m33: w,
            };
        default:
            return matrix;
    }
}

export function transpose(matrix: Mat4) {
    matrix.m01 = matrix.m10;
    matrix.m02 = matrix.m20;
    matrix.m03 = matrix.m30;
    matrix.m10 = matrix.m01;
    matrix.m12 = matrix.m21;
    matrix.m13 = matrix.m31;
    matrix.m20 = matrix.m02;
    matrix.m21 = matrix.m12;
    matrix.m23 = matrix.m32;
    matrix.m30 = matrix.m03;
    matrix.m31 = matrix.m13;
    matrix.m32 = matrix.m23;
}

export function invert(matrix: Mat4) {
    if (matrix.m03 == 0 && matrix.m13 == 0 && matrix.m23 == 0 && matrix.m33 == 1) {
        invertAffine(matrix);
        return;
    }
}

export function invertAffine(matrix: Mat4) {
    const r: mat3.Mat3 = {
        m00: matrix.m00,
        m01: matrix.m01,
        m02: matrix.m02,
        m10: matrix.m10,
        m11: matrix.m11,
        m12: matrix.m12,
        m20: matrix.m20,
        m21: matrix.m21,
        m22: matrix.m22,
    };

    mat3.invert(r);

    matrix.m00 = r.m00;
    matrix.m01 = r.m01;
    matrix.m02 = r.m02;
    matrix.m10 = r.m10;
    matrix.m11 = r.m11;
    matrix.m12 = r.m12;
    matrix.m20 = r.m20;
    matrix.m21 = r.m21;
    matrix.m22 = r.m22;

    const x = matrix.m30;
    const y = matrix.m31;
    const z = matrix.m32;

    matrix.m30 = -(r.m00 * x + r.m10 * y + r.m20 * z);
    matrix.m31 = -(r.m01 * x + r.m11 * y + r.m21 * z);
    matrix.m32 = -(r.m02 * x + r.m12 * y + r.m22 * z);
}

export function invertGeneral(matrix: Mat4) {
    const cofactor0 = getCofactor(
        matrix.m11,
        matrix.m12,
        matrix.m13,
        matrix.m21,
        matrix.m22,
        matrix.m23,
        matrix.m31,
        matrix.m32,
        matrix.m33
    );
    const cofactor1 = getCofactor(
        matrix.m10,
        matrix.m12,
        matrix.m13,
        matrix.m20,
        matrix.m22,
        matrix.m23,
        matrix.m30,
        matrix.m32,
        matrix.m33
    );
    const cofactor2 = getCofactor(
        matrix.m10,
        matrix.m11,
        matrix.m13,
        matrix.m20,
        matrix.m21,
        matrix.m23,
        matrix.m30,
        matrix.m31,
        matrix.m33
    );
    const cofactor3 = getCofactor(
        matrix.m10,
        matrix.m11,
        matrix.m12,
        matrix.m20,
        matrix.m21,
        matrix.m22,
        matrix.m30,
        matrix.m31,
        matrix.m32
    );

    const determinant =
        matrix.m00 * cofactor0 - matrix.m01 * cofactor1 + matrix.m02 * cofactor2 - matrix.m03 * cofactor3;
    if (Math.abs(determinant) <= EPSILON) {
        matrix = identity();
    }

    const cofactor4 = getCofactor(
        matrix.m01,
        matrix.m02,
        matrix.m03,
        matrix.m21,
        matrix.m22,
        matrix.m23,
        matrix.m31,
        matrix.m32,
        matrix.m33
    );
    const cofactor5 = getCofactor(
        matrix.m00,
        matrix.m02,
        matrix.m03,
        matrix.m20,
        matrix.m22,
        matrix.m23,
        matrix.m30,
        matrix.m32,
        matrix.m33
    );
    const cofactor6 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m03,
        matrix.m20,
        matrix.m21,
        matrix.m23,
        matrix.m30,
        matrix.m31,
        matrix.m33
    );
    const cofactor7 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m02,
        matrix.m20,
        matrix.m21,
        matrix.m22,
        matrix.m30,
        matrix.m31,
        matrix.m32
    );

    const cofactor8 = getCofactor(
        matrix.m01,
        matrix.m02,
        matrix.m03,
        matrix.m11,
        matrix.m12,
        matrix.m13,
        matrix.m31,
        matrix.m32,
        matrix.m33
    );
    const cofactor9 = getCofactor(
        matrix.m00,
        matrix.m02,
        matrix.m03,
        matrix.m10,
        matrix.m12,
        matrix.m13,
        matrix.m30,
        matrix.m32,
        matrix.m33
    );
    const cofactor10 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m03,
        matrix.m10,
        matrix.m11,
        matrix.m13,
        matrix.m30,
        matrix.m31,
        matrix.m33
    );
    const cofactor11 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m02,
        matrix.m10,
        matrix.m11,
        matrix.m12,
        matrix.m30,
        matrix.m31,
        matrix.m32
    );

    const cofactor12 = getCofactor(
        matrix.m01,
        matrix.m02,
        matrix.m03,
        matrix.m11,
        matrix.m12,
        matrix.m13,
        matrix.m21,
        matrix.m22,
        matrix.m23
    );
    const cofactor13 = getCofactor(
        matrix.m00,
        matrix.m02,
        matrix.m03,
        matrix.m10,
        matrix.m12,
        matrix.m13,
        matrix.m20,
        matrix.m22,
        matrix.m23
    );
    const cofactor14 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m03,
        matrix.m10,
        matrix.m11,
        matrix.m13,
        matrix.m20,
        matrix.m21,
        matrix.m23
    );
    const cofactor15 = getCofactor(
        matrix.m00,
        matrix.m01,
        matrix.m02,
        matrix.m10,
        matrix.m11,
        matrix.m12,
        matrix.m20,
        matrix.m21,
        matrix.m22
    );

    const invDeterminant = 1 / determinant;

    matrix.m00 = cofactor0 * invDeterminant;
    matrix.m01 = -cofactor4 * invDeterminant;
    matrix.m02 = cofactor8 * invDeterminant;
    matrix.m03 = -cofactor12 * invDeterminant;

    matrix.m10 = -cofactor1 * invDeterminant;
    matrix.m11 = cofactor5 * invDeterminant;
    matrix.m12 = -cofactor9 * invDeterminant;
    matrix.m13 = cofactor13 * invDeterminant;

    matrix.m20 = cofactor2 * invDeterminant;
    matrix.m21 = -cofactor6 * invDeterminant;
    matrix.m22 = cofactor10 * invDeterminant;
    matrix.m23 = -cofactor14 * invDeterminant;

    matrix.m30 = -cofactor3 * invDeterminant;
    matrix.m31 = cofactor7 * invDeterminant;
    matrix.m32 = -cofactor11 * invDeterminant;
    matrix.m33 = cofactor15 * invDeterminant;
}

function getCofactor(
    m0: number,
    m1: number,
    m2: number,
    m3: number,
    m4: number,
    m5: number,
    m6: number,
    m7: number,
    m8: number
): number {
    return m0 * (m4 * m8 - m5 * m7) - m1 * (m3 * m8 - m5 * m6) + m2 * (m3 * m7 - m4 * m6);
}

export function lookAt(matrix: Mat4, target: vec3.Vec3) {
    const position = { x: matrix.m30, y: matrix.m31, z: matrix.m32 };
    const forward = vec3.normalize(vec3.subtract(target, position));
    let up: vec3.Vec3 = { x: 0, y: 0, z: 1 };
    let left: vec3.Vec3 = { x: 0, y: 1, z: 0 };

    if (Math.abs(forward.x) < EPSILON && Math.abs(forward.z) < EPSILON) {
        if (forward.y > 0) {
            up = { x: 0, y: 0, z: -1 };
        }
    } else {
        up = { x: 0, y: 1, z: 0 };
    }

    left = vec3.normalize(vec3.cross(up, forward));
    up = vec3.cross(forward, left);

    matrix.m00 = left.x;
    matrix.m01 = left.y;
    matrix.m02 = left.z;

    matrix.m10 = up.x;
    matrix.m11 = up.y;
    matrix.m12 = up.z;

    matrix.m20 = forward.x;
    matrix.m21 = forward.y;
    matrix.m22 = forward.z;
}

export function translate(matrix: Mat4, v: vec3.Vec3) {
    matrix.m00 += matrix.m03 * v.x;
    matrix.m01 += matrix.m03 * v.y;
    matrix.m02 += matrix.m03 * v.z;

    matrix.m10 += matrix.m13 * v.x;
    matrix.m11 += matrix.m13 * v.y;
    matrix.m12 += matrix.m13 * v.z;

    matrix.m20 += matrix.m23 * v.x;
    matrix.m21 += matrix.m23 * v.y;
    matrix.m22 += matrix.m23 * v.z;

    matrix.m30 += matrix.m33 * v.x;
    matrix.m31 += matrix.m33 * v.y;
    matrix.m32 += matrix.m33 * v.z;
}

export function multiply(matrix: Mat4, vector: vec3.Vec3): vec3.Vec3 {
    return {
        x: matrix.m00 * vector.x + matrix.m10 * vector.y + matrix.m20 * vector.z + matrix.m30,
        y: matrix.m01 * vector.x + matrix.m11 * vector.y + matrix.m21 * vector.z + matrix.m31,
        z: matrix.m02 * vector.x + matrix.m12 * vector.y + matrix.m22 * vector.z + matrix.m32,
    };
}
