export type Vector2 = {
    x: number;
    y: number;
};

export function vector2FromArray(array: ArrayLike<number> | [number, number]): Vector2 {
    return { x: array[0], y: array[1] };
}

export function vector2FromPointerEvent(event: PointerEvent): Vector2 {
    return { x: event.pageX, y: event.pageY };
}

export function vectorLength(vector: Vector2): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

export function pointDistance(point1: Vector2, point2: Vector2): number {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

export function subtractVectors(minuend: Vector2, subtrahend: Vector2): Vector2 {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y };
}

export function addVectors(vector1: Vector2, vector2: Vector2): Vector2 {
    return { x: vector1.x + vector2.x, y: vector1.y + vector2.y };
}

export function normalizeVector(vector: Vector2): Vector2 {
    const length = vectorLength(vector);
    return { x: vector.x / length, y: vector.y / length };
}

export function scaleVector(vector: Vector2, scalar: number): Vector2 {
    return { x: vector.x * scalar, y: vector.y * scalar };
}

export function scaleVectorNonUniform(vector: Vector2, scalarX: number, scalarY: number): Vector2 {
    return { x: vector.x * scalarX, y: vector.y * scalarY };
}

export function multiplyVectors(vecA: Vector2, vecB: Vector2): Vector2 {
    return { x: vecA.x * vecB.x, y: vecA.y * vecB.y };
}

export function addScalarToVector(vector: Vector2, scalar: number): Vector2 {
    return { x: vector.x + scalar, y: vector.y + scalar };
}

export function vectorsEqual(vector1: Vector2, vector2: Vector2): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y;
}

// Rotate vector counter-clockwise by the given angle (in radians)
export function rotateVector(vec: Vector2, angle: number): Vector2 {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return {
        x: cosA * vec.x - sinA * vec.y,
        y: sinA * vec.x + cosA * vec.y,
    };
}

// Rotate a point around a pivot point by a given angle
// Rotation is counter-clockwise in radians
export function rotatePointAround(point: Vector2, pivotPoint: Vector2, angle: number): Vector2 {
    const vec: Vector2 = subtractVectors(point, pivotPoint);
    const rotatedVec = rotateVector(vec, angle);
    return addVectors(rotatedVec, pivotPoint);
}
