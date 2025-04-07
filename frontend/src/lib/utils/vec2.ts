export type Vec2 = {
    x: number;
    y: number;
};

export function vec2FromArray(array: ArrayLike<number> | [number, number]): Vec2 {
    return { x: array[0], y: array[1] };
}

export function vec2FromPointerEvent(event: PointerEvent): Vec2 {
    return { x: event.pageX, y: event.pageY };
}

export function vec2Length(vector: Vec2): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

export function point2Distance(point1: Vec2, point2: Vec2): number {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

export function subtractVec2(minuend: Vec2, subtrahend: Vec2): Vec2 {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y };
}

export function addVec2(vector1: Vec2, vector2: Vec2): Vec2 {
    return { x: vector1.x + vector2.x, y: vector1.y + vector2.y };
}

export function normalizeVec2(vector: Vec2): Vec2 {
    const length = vec2Length(vector);
    return { x: vector.x / length, y: vector.y / length };
}

export function scaleVec2(vector: Vec2, scalar: number): Vec2 {
    return { x: vector.x * scalar, y: vector.y * scalar };
}

export function scaleVec2NonUniform(vector: Vec2, scalarX: number, scalarY: number): Vec2 {
    return { x: vector.x * scalarX, y: vector.y * scalarY };
}

export function multiplyElementwiseVec2(vecA: Vec2, vecB: Vec2): Vec2 {
    return { x: vecA.x * vecB.x, y: vecA.y * vecB.y };
}

export function addScalarToVec2(vector: Vec2, scalar: number): Vec2 {
    return { x: vector.x + scalar, y: vector.y + scalar };
}

export function vec2Equal(vector1: Vec2, vector2: Vec2): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y;
}

// Rotate vector counter-clockwise by the given angle (in radians)
export function rotateVec2(vec: Vec2, angleInRad: number): Vec2 {
    const cosA = Math.cos(angleInRad);
    const sinA = Math.sin(angleInRad);
    return {
        x: cosA * vec.x - sinA * vec.y,
        y: sinA * vec.x + cosA * vec.y,
    };
}

// Rotate a point around a pivot point by a given angle
// Rotation is counter-clockwise in radians
export function rotatePoint2Around(point: Vec2, pivotPoint: Vec2, angleInRad: number): Vec2 {
    const vec: Vec2 = subtractVec2(point, pivotPoint);
    const rotatedVec = rotateVec2(vec, angleInRad);
    return addVec2(rotatedVec, pivotPoint);
}
