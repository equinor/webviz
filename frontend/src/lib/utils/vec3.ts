import { Mat3 } from "./mat3";

export type Vec3 = {
    x: number;
    y: number;
    z: number;
};

export function create(x: number, y: number, z: number): Vec3 {
    return { x, y, z };
}

export function fromArray(array: ArrayLike<number> | [number, number, number]): Vec3 {
    return { x: array[0], y: array[1], z: array[2] };
}

export function length(vector: Vec3): number {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

export function distance(point1: Vec3, point2: Vec3): number {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2 + (point1.z - point2.z) ** 2);
}

export function subtract(minuend: Vec3, subtrahend: Vec3): Vec3 {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y, z: minuend.z - subtrahend.z };
}

export function add(vector1: Vec3, vector2: Vec3): Vec3 {
    return { x: vector1.x + vector2.x, y: vector1.y + vector2.y, z: vector1.z + vector2.z };
}

export function normalize(vector: Vec3): Vec3 {
    const len = length(vector);
    return { x: vector.x / len, y: vector.y / len, z: vector.z / len };
}

export function abs(vector: Vec3): Vec3 {
    return { x: Math.abs(vector.x), y: Math.abs(vector.y), z: Math.abs(vector.z) };
}

export function scale(vector: Vec3, scalar: number): Vec3 {
    return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function equal(vector1: Vec3, vector2: Vec3): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y && vector1.z === vector2.z;
}

export function dot(vector1: Vec3, vector2: Vec3): number {
    return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
}

export function cross(vector1: Vec3, vector2: Vec3): Vec3 {
    return {
        x: vector1.y * vector2.z - vector1.z * vector2.y,
        y: vector1.z * vector2.x - vector1.x * vector2.z,
        z: vector1.x * vector2.y - vector1.y * vector2.x,
    };
}

export function transform(vector: Vec3, matrix: Mat3): Vec3 {
    return {
        x: matrix.m00 * vector.x + matrix.m01 * vector.y + matrix.m02 * vector.z,
        y: matrix.m10 * vector.x + matrix.m11 * vector.y + matrix.m12 * vector.z,
        z: matrix.m20 * vector.x + matrix.m21 * vector.y + matrix.m22 * vector.z,
    };
}

export function clone(vector: Vec3): Vec3 {
    return { x: vector.x, y: vector.y, z: vector.z };
}
