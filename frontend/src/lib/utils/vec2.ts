export type Vec2 = {
    x: number;
    y: number;
};

/**
 * Creates a 2D vector from an array
 * @param array An array-like with two numbers, i.e. [x, y]
 * @returns A 2D vector constructed from the first two elements of the input array.
 */
export function vec2FromArray(array: ArrayLike<number> | [number, number]): Vec2 {
    return { x: array[0], y: array[1] };
}

/**
 * Converts a 2D vector to an array of numbers.
 * @param vector A 2D vector.
 * @returns A new array of numbers containing the components of the vector: [x, y].
 */
export function vec2toArray(vector: Vec2): [number, number] {
    return [vector.x, vector.y];
}

/**
 * Extracts the page coordinate of a pointer event in the form of a 2D vector
 * @param event A pointer event
 * @returns A 2D vector representing the page coordinates of the pointer event
 */
export function vec2FromPointerEvent(event: PointerEvent): Vec2 {
    return { x: event.pageX, y: event.pageY };
}

/**
 * Calculates the length (magnitude) of a 2D vector.
 * @param vector A 2D vector
 * @returns The length (magnitude) of the vector
 */
export function vec2Length(vector: Vec2): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

/**
 * Calculates the distance between two 2D points.
 * @param point1 The first point
 * @param point2 The second point
 * @returns The distance between the two points
 */
export function point2Distance(point1: Vec2, point2: Vec2): number {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

/**
 * Subtracts one 2D vector from another.
 * @param minuend The vector to subtract from
 * @param subtrahend The vector to subtract
 * @returns The resulting vector after subtraction
 */
export function subtractVec2(minuend: Vec2, subtrahend: Vec2): Vec2 {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y };
}

/**
 * Adds two vectors together
 * @param vector1 The first vector
 * @param vector2 The second vector
 * @returns The resulting vector after addition
 */
export function addVec2(vector1: Vec2, vector2: Vec2): Vec2 {
    return { x: vector1.x + vector2.x, y: vector1.y + vector2.y };
}

/**
 * Normalizes a vector, so that it's length is 1
 * @param vector A 2D vector
 * @returns The normalized vector
 */
export function normalizeVec2(vector: Vec2): Vec2 {
    const length = vec2Length(vector);
    return { x: vector.x / length, y: vector.y / length };
}

/**
 * Scales a vector by a given value
 * @param vector A 2D vector
 * @param scalar A scalar value
 * @returns The scaled vector
 */
export function scaleVec2(vector: Vec2, scalar: number): Vec2 {
    return { x: vector.x * scalar, y: vector.y * scalar };
}

/**
 * Scales a vector non-uniformly
 * @param vector A 2D vector
 * @param scalarX The amount to scale in the X direction
 * @param scalarY The amount to scale in the Y direction
 * @returns The scaled vector
 */
export function scaleVec2NonUniform(vector: Vec2, scalarX: number, scalarY: number): Vec2 {
    return { x: vector.x * scalarX, y: vector.y * scalarY };
}

/**
 * Multiplies two vectors element-wise (i.e, Hadamard product)
 * @param vecA The first vector
 * @param vecB The second vector
 * @returns The multiplied vector
 */
export function multiplyElementwiseVec2(vecA: Vec2, vecB: Vec2): Vec2 {
    return { x: vecA.x * vecB.x, y: vecA.y * vecB.y };
}

/**
 * Extend a vector by adding a number to each axis
 * @param vector A 2D vector
 * @param scalar A scalar value
 * @returns The extended vector
 */
export function addScalarToVec2(vector: Vec2, scalar: number): Vec2 {
    return { x: vector.x + scalar, y: vector.y + scalar };
}

/**
 * Checks if two vectors are equal
 * @param vector1 The first vector
 * @param vector2 The second vector
 * @returns True if the vectors are equal, false otherwise
 */
export function vec2Equal(vector1: Vec2, vector2: Vec2): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y;
}

/**
 * Rotates a vector counter-clockwise.
 * @param vector A 2D vector
 * @param angleInRad How much to rotate the vector, in radians
 * @returns The rotated vector
 */
export function rotateVec2(vector: Vec2, angleInRad: number): Vec2 {
    const cosA = Math.cos(angleInRad);
    const sinA = Math.sin(angleInRad);
    return {
        x: cosA * vector.x - sinA * vector.y,
        y: sinA * vector.x + cosA * vector.y,
    };
}

/**
 * Rotates a point counter-clockwise around another pivot point by a given angle.
 * @param point The point to rotate
 * @param pivotPoint The pivot point to rotate around
 * @param angleInRad How much to rotate the point, in radians
 * @returns The rotated point
 */
export function rotatePoint2Around(point: Vec2, pivotPoint: Vec2, angleInRad: number): Vec2 {
    const vec: Vec2 = subtractVec2(point, pivotPoint);
    const rotatedVec = rotateVec2(vec, angleInRad);
    return addVec2(rotatedVec, pivotPoint);
}
