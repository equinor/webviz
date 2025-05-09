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
