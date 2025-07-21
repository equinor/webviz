import type { Mat3 } from "./mat3";

/**
 * A 3D vector.
 */
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};

/**
 * Creates a new 3D vector from the given components.
 *
 * @param x The x component.
 * @param y The y component.
 * @param z The z component.
 * @returns A new 3D vector.
 */
export function create(x: number, y: number, z: number): Vec3 {
    return { x, y, z };
}

/**
 * Creates a new 3D vector from the given array.
 *
 * @param array The array containing the components: [x, y, z].
 * @returns A new 3D vector.
 */
export function fromArray(array: ArrayLike<number> | [number, number, number]): Vec3 {
    if (array.length !== 3) {
        throw new Error("The array must contain exactly three elements.");
    }
    return { x: array[0], y: array[1], z: array[2] };
}

/**
 * Converts a 3D vector to an array of numbers.
 *
 * @param vector A 3D vector.
 * @returns A new array of numbers containing the components of the vector: [x, y, z].
 */
export function toArray(vector: Vec3): [number, number, number] {
    return [vector.x, vector.y, vector.z];
}

/**
 * Clones the given vector.
 *
 * @param vector The vector to clone.
 * @returns A new vector that is a clone of the given vector.
 */
export function clone(vector: Vec3): Vec3 {
    return { x: vector.x, y: vector.y, z: vector.z };
}

/**
 * Calculates the length of the given vector.
 *
 * @param vector The vector.
 * @returns The length of the vector.
 */
export function length(vector: Vec3): number {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

/**
 * Calculates the squared length of the given vector.
 *
 * @param vector The vector.
 * @returns The squared length of the vector.
 */
export function squaredLength(vector: Vec3): number {
    return vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
}

/**
 * Calculates the distance between two points.
 *
 * @param point1 The first point.
 * @param point2 The second point.
 * @returns The distance between the two points.
 */
export function distance(point1: Vec3, point2: Vec3): number {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2 + (point1.z - point2.z) ** 2);
}

/**
 * Calculates the squared distance between two points.
 *
 * @param point1 The first point.
 * @param point2 The second point.
 * @returns The squared distance between the two points.
 */
export function squaredDistance(point1: Vec3, point2: Vec3): number {
    return (point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2 + (point1.z - point2.z) ** 2;
}

/**
 * Subtracts the subtrahend from the minuend.
 *
 * @param minuend The minuend.
 * @param subtrahend The subtrahend.
 * @returns A new vector that is the result of the subtraction.
 */
export function subtract(minuend: Vec3, subtrahend: Vec3): Vec3 {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y, z: minuend.z - subtrahend.z };
}

/**
 * Adds two or more vectors.
 *
 * @param vector1 The first vector.
 * @param vectors The other vectors.
 * @returns A new vector that is the result of the addition.
 */
export function add(vector1: Vec3, ...vectors: Vec3[]): Vec3 {
    if (vectors.length === 0) {
        return clone(vector1);
    }

    return vectors.reduce((acc, vector2) => {
        if (!vector2) {
            throw new Error("Cannot add undefined or null vector.");
        }
        if (typeof vector2.x !== "number" || typeof vector2.y !== "number" || typeof vector2.z !== "number") {
            throw new Error("Invalid vector: must have numeric x, y, and z properties.");
        }

        if (typeof acc.x !== "number" || typeof acc.y !== "number" || typeof acc.z !== "number") {
            throw new Error("Invalid accumulator vector: must have numeric x, y, and z properties.");
        }

        return { x: acc.x + vector2.x, y: acc.y + vector2.y, z: acc.z + vector2.z };
    }, vector1);
}

/**
 * Concatenates multiple vectors.
 *
 * @param vectors The vectors to concatenate.
 * @returns A new vector that is the result of the concatenation.
 */
export function concat(...vectors: Vec3[]): Vec3 {
    return vectors.reduce((acc, vector) => add(acc, vector), create(0, 0, 0));
}

/**
 * Normalizes the given vector.
 *
 * @param vector The vector.
 * @returns A new vector that is the normalized version of the given vector.
 */
export function normalize(vector: Vec3): Vec3 {
    const len = length(vector);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: vector.x / len, y: vector.y / len, z: vector.z / len };
}

/**
 * Negates the given vector.
 *
 * @param vector The vector.
 * @returns A new vector that is the negated version of the given vector.
 */
export function negate(vector: Vec3): Vec3 {
    return { x: -vector.x, y: -vector.y, z: -vector.z };
}

/**
 * Returns the absolute values of the components of the given vector.
 *
 * @param vector The vector.
 * @returns A new vector that is the absolute version of the given vector.
 */
export function abs(vector: Vec3): Vec3 {
    return { x: Math.abs(vector.x), y: Math.abs(vector.y), z: Math.abs(vector.z) };
}

/**
 * Scales the given vector by the given scalar.
 *
 * @param vector The vector.
 * @param scalar The scalar.
 * @returns A new vector that is the result of the scaling.
 */
export function scale(vector: Vec3, scalar: number): Vec3 {
    return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

/**
 * Scales the given vector components by the respective given scalar.
 *
 * @param vector The vector.
 * @param scalarX The scalar for the x component.
 * @param scalarY The scalar for the y component.
 * @param scalarZ The scalar for the z component.
 * @returns A new vector that is the result of the scaling.
 */
export function scaleNonUniform(vector: Vec3, scalarX: number, scalarY: number, scalarZ: number): Vec3 {
    return { x: vector.x * scalarX, y: vector.y * scalarY, z: vector.z * scalarZ };
}

/**
 * Multiplies two vectors element-wise.
 *
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns A new vector that is the result of the element-wise multiplication.
 */
export function multiplyElementWise(vecA: Vec3, vecB: Vec3): Vec3 {
    return { x: vecA.x * vecB.x, y: vecA.y * vecB.y, z: vecA.z * vecB.z };
}

/**
 * Returns true if the two vectors are equal.
 *
 * @param vector1 The first vector.
 * @param vector2 The second vector.
 * @returns True if the two vectors are equal.
 */
export function equal(vector1: Vec3, vector2: Vec3): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y && vector1.z === vector2.z;
}

/**
 * Calculates the dot product of two vectors.
 *
 * @param vector1 The first vector.
 * @param vector2 The second vector.
 * @returns The dot product of the two vectors.
 */
export function dot(vector1: Vec3, vector2: Vec3): number {
    return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
}

/**
 * Calculates the cross product of two vectors.
 *
 * @param vector1 The first vector.
 * @param vector2 The second vector.
 * @returns A new vector that is the cross product of the two vectors.
 */
export function cross(vector1: Vec3, vector2: Vec3): Vec3 {
    return {
        x: vector1.y * vector2.z - vector1.z * vector2.y,
        y: vector1.z * vector2.x - vector1.x * vector2.z,
        z: vector1.x * vector2.y - vector1.y * vector2.x,
    };
}

/**
 * Transforms the given vector by the given matrix.
 *
 * @param vector A 3D vector to transform.
 * @param matrix A 3x3 matrix to transform the vector with.
 * @returns A new 3D vector that is the result of the transformation.
 */
export function transform(vector: Vec3, matrix: Mat3): Vec3 {
    return {
        x: matrix.m00 * vector.x + matrix.m01 * vector.y + matrix.m02 * vector.z,
        y: matrix.m10 * vector.x + matrix.m11 * vector.y + matrix.m12 * vector.z,
        z: matrix.m20 * vector.x + matrix.m21 * vector.y + matrix.m22 * vector.z,
    };
}
