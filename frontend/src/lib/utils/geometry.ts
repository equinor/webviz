export type Point2D = {
    x: number;
    y: number;
};

export type Vector2D = {
    x: number;
    y: number;
};

export type Size2D = {
    width: number;
    height: number;
};

export type Rect2D = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const ORIGIN = Object.freeze({ x: 0, y: 0 });
export const MANHATTAN_LENGTH = 13.11;

export function arrayPointToPoint2D(arrayPoint: number[] | [number, number]): Point2D {
    return { x: arrayPoint[0], y: arrayPoint[1] };
}

export function pointerEventToPoint(event: PointerEvent): Point2D {
    return { x: event.pageX, y: event.pageY };
}

export function vectorLength(vector: Vector2D): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

export function pointDistance(point1: Point2D, point2: Point2D): number {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

export function pointSubtraction(minuend: Point2D, subtrahend: Point2D): Vector2D {
    return { x: minuend.x - subtrahend.x, y: minuend.y - subtrahend.y };
}

export function vectorSum(vector1: Vector2D, vector2: Vector2D): Vector2D {
    return { x: vector1.x + vector2.x, y: vector1.y + vector2.y };
}

export function vectorAddScalarToComponents(vector: Vector2D, scalar: number): Vector2D {
    return { x: vector.x + scalar, y: vector.y + scalar };
}

export function vectorNormalize(vector: Vector2D): Vector2D {
    const length = vectorLength(vector);
    return { x: vector.x / length, y: vector.y / length };
}

export function pointMultiplyComponentsWithIndividualScalars(
    point: Point2D,
    scalarX: number,
    scalarY: number
): Point2D {
    return { x: point.x * scalarX, y: point.y * scalarY };
}

export function vectorMultiplyWithScalar(vector: Vector2D, scalar: number): Vector2D {
    return { x: vector.x * scalar, y: vector.y * scalar };
}

export function pointIndividuallyMultiplyComponentsWithVector(point: Point2D, vector: Vector2D): Point2D {
    return { x: point.x * vector.x, y: point.y * vector.y };
}

export function isPartlyContained(
    centerPoint1: Point2D,
    dimensions1: Size2D,
    centerPoint2: Point2D,
    dimensions2: Size2D
): boolean {
    return !(
        centerPoint1.x + dimensions1.width / 2 < centerPoint2.x - dimensions2.width / 2 ||
        centerPoint1.x - dimensions1.width / 2 > centerPoint2.x + dimensions2.width / 2 ||
        centerPoint1.y + dimensions1.height / 2 < centerPoint2.y - dimensions2.height / 2 ||
        centerPoint1.y - dimensions1.height / 2 > centerPoint2.y + dimensions2.height / 2
    );
}

export function pointIsContained(point: Point2D, dimensions: Size2D, centerPoint: Point2D): boolean {
    return (
        point.x >= centerPoint.x - dimensions.width / 2 &&
        point.x <= centerPoint.x + dimensions.width / 2 &&
        point.y >= centerPoint.y - dimensions.height / 2 &&
        point.y <= centerPoint.y + dimensions.height / 2
    );
}

export function scaleRect(rect: Rect2D, factor: number): Rect2D {
    return {
        x: rect.x * factor,
        y: rect.y * factor,
        width: rect.width * factor,
        height: rect.height * factor,
    };
}

export function scaleRectIndividually(rect: Rect2D, factorX: number, factorY: number): Rect2D {
    return {
        x: rect.x * factorX,
        y: rect.y * factorY,
        width: rect.width * factorX,
        height: rect.height * factorY,
    };
}

export function rectContainsPoint(rect: Rect2D, point: Point2D): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function scaleRectAroundCenter(rect: Rect2D, factor: number): Rect2D {
    return {
        x: rect.x - (rect.width * factor - rect.width) / 2,
        y: rect.y - (rect.height * factor - rect.height) / 2,
        width: rect.width * factor,
        height: rect.height * factor,
    };
}

export function addMarginToRect(rect: Rect2D, margin: number): Rect2D {
    return {
        x: rect.x - margin,
        y: rect.y - margin,
        width: rect.width + margin * 2,
        height: rect.height + margin * 2,
    };
}

export function outerRectContainsInnerRect(outerRect: Rect2D, innerRect: Rect2D): boolean {
    return (
        outerRect.x <= innerRect.x &&
        outerRect.y <= innerRect.y &&
        outerRect.x + outerRect.width >= innerRect.x + innerRect.width &&
        outerRect.y + outerRect.height >= innerRect.y + innerRect.height
    );
}

export function pointRelativeToDomRect(point: Point2D, domRect: DOMRect): Point2D {
    return { x: point.x - domRect.x, y: point.y - domRect.y };
}

export function sizeSum(size1: Size2D, size2: Size2D): Size2D {
    return {
        width: size1.width + size2.width,
        height: size1.width + size2.width,
    };
}

export function sizeDifference(size1: Size2D, size2: Size2D): Size2D {
    return {
        width: size1.width - size2.width,
        height: size1.width - size2.width,
    };
}

export function sizeMultiplyWithScalar(size1: Size2D, scalar: number): Size2D {
    return { width: size1.width * scalar, height: size1.width * scalar };
}

export function pointsAreEqual(point1: Point2D, point2: Point2D): boolean {
    return point1.x === point2.x && point1.y === point2.y;
}

export function vectorsAreEqual(vector1: Vector2D, vector2: Vector2D): boolean {
    return vector1.x === vector2.x && vector1.y === vector2.y;
}

export function sizesAreEqual(size1: Size2D, size2: Size2D): boolean {
    return size1.width === size2.width && size1.height === size2.height;
}

export function rectsAreEqual(rect1: Rect2D, rect2: Rect2D): boolean {
    return rect1.x === rect2.x && rect1.y === rect2.y && rect1.width === rect2.width && rect1.height === rect2.height;
}

export function isDOMRectContained(inner: DOMRect, outer: DOMRect): boolean {
    return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.y + inner.height <= outer.y + outer.height &&
        inner.x + inner.width <= outer.x + outer.width
    );
}

export function domRectsAreEqual(rect1: DOMRect, rect2: DOMRect): boolean {
    return rect1.x === rect2.x && rect1.y === rect2.y && rect1.width === rect2.width && rect1.height === rect2.height;
}
