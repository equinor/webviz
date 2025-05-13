/**
 * A 3x3 matrix.
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

/**
 * Creates a new 3x3 matrix with all elements set to 0.
 *
 * @returns A new 3x3 matrix.
 */
export function createEmpty(): Mat3 {
    return {
        m00: 0,
        m01: 0,
        m02: 0,
        m10: 0,
        m11: 0,
        m12: 0,
        m20: 0,
        m21: 0,
        m22: 0,
    };
}

/**
 * Creates a new 3x3 matrix with the given elements.
 *
 * @param m00 The element at row 0, column 0.
 * @param m01 The element at row 0, column 1.
 * @param m02 The element at row 0, column 2.
 * @param m10 The element at row 1, column 0.
 * @param m11 The element at row 1, column 1.
 * @param m12 The element at row 1, column 2.
 * @param m20 The element at row 2, column 0.
 * @param m21 The element at row 2, column 1.
 * @param m22 The element at row 2, column 2.
 * @returns A new 3x3 matrix.
 */
export function create(
    m00: number,
    m01: number,
    m02: number,
    m10: number,
    m11: number,
    m12: number,
    m20: number,
    m21: number,
    m22: number
): Mat3 {
    return { m00, m01, m02, m10, m11, m12, m20, m21, m22 };
}

/**
 * Creates a new 3x3 matrix from the given array of numbers.
 *
 * @param array An array of numbers in the following order: [m00, m01, m02, m10, m11, m12, m20, m21, m22].
 * @returns A new 3x3 matrix.
 */
export function fromArray(
    array: ArrayLike<number> | [number, number, number, number, number, number, number, number, number]
): Mat3 {
    return {
        m00: array[0],
        m01: array[1],
        m02: array[2],
        m10: array[3],
        m11: array[4],
        m12: array[5],
        m20: array[6],
        m21: array[7],
        m22: array[8],
    };
}