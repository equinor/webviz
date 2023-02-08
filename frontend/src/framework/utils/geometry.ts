export type Point = {
    x: number;
    y: number;
};

export type Size = {
    width: number;
    height: number;
};

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const ORIGIN = Object.freeze({ x: 0, y: 0 });
export const MANHATTAN_LENGTH = 13.11;

export const pointerEventToPoint = (event: PointerEvent): Point => {
    return { x: event.pageX, y: event.pageY };
};

export const vectorLength = (vector: Point): number => {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
};

export const pointDistance = (point1: Point, point2: Point): number => {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

export const pointDifference = (point1: Point, point2: Point): Point => {
    return { x: point1.x - point2.x, y: point1.y - point2.y };
};

export const pointSum = (point1: Point, point2: Point): Point => {
    return { x: point1.x + point2.x, y: point1.y + point2.y };
};

export const pointAddScalar = (point: Point, scalar: number): Point => {
    return { x: point.x + scalar, y: point.y + scalar };
};

export const pointScale = (point: Point, factor: number): Point => {
    return { x: point.x / factor, y: point.y / factor };
};

export const pointMultiplyWithScalar = (point: Point, scalar: number): Point => {
    return { x: point.x * scalar, y: point.y * scalar };
};

export const isPartlyContained = (
    centerPoint1: Point,
    dimensions1: Size,
    centerPoint2: Point,
    dimensions2: Size
): boolean => {
    return !(
        centerPoint1.x + dimensions1.width / 2 < centerPoint2.x - dimensions2.width / 2 ||
        centerPoint1.x - dimensions1.width / 2 > centerPoint2.x + dimensions2.width / 2 ||
        centerPoint1.y + dimensions1.height / 2 < centerPoint2.y - dimensions2.height / 2 ||
        centerPoint1.y - dimensions1.height / 2 > centerPoint2.y + dimensions2.height / 2
    );
};

export const pointIsContained = (point: Point, dimensions: Size, centerPoint: Point): boolean => {
    return (
        point.x >= centerPoint.x - dimensions.width / 2 &&
        point.x <= centerPoint.x + dimensions.width / 2 &&
        point.y >= centerPoint.y - dimensions.height / 2 &&
        point.y <= centerPoint.y + dimensions.height / 2
    );
};

export const scaleRect = (rect: Rect, factor: number): Rect => {
    return {
        x: rect.x * factor,
        y: rect.y * factor,
        width: rect.width * factor,
        height: rect.height * factor,
    };
};

export const scaleRectIndividually = (rect: Rect, factorX: number, factorY: number): Rect => {
    return {
        x: rect.x * factorX,
        y: rect.y * factorY,
        width: rect.width * factorX,
        height: rect.height * factorY,
    };
};

export const rectContainsPoint = (rect: Rect, point: Point): boolean => {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
};

export const outerRectContainsInnerRect = (outerRect: Rect, innerRect: Rect): boolean => {
    return (
        outerRect.x <= innerRect.x &&
        outerRect.y <= innerRect.y &&
        outerRect.x + outerRect.width >= innerRect.x + innerRect.width &&
        outerRect.y + outerRect.height >= innerRect.y + innerRect.height
    );
};

export const pointRelativeToDomRect = (point: Point, domRect: DOMRect): Point => {
    return { x: point.x - domRect.x, y: point.y - domRect.y };
};

export const sizeSum = (size1: Size, size2: Size): Size => {
    return {
        width: size1.width + size2.width,
        height: size1.width + size2.width,
    };
};

export const sizeDifference = (size1: Size, size2: Size): Size => {
    return {
        width: size1.width - size2.width,
        height: size1.width - size2.width,
    };
};

export const sizeMultiplyWithScalar = (size1: Size, scalar: number): Size => {
    return { width: size1.width * scalar, height: size1.width * scalar };
};

export const pointsAreEqual = (point1: Point, point2: Point): boolean => point1.x === point2.x && point1.y === point2.y;

export const sizesAreEqual = (size1: Size, size2: Size): boolean =>
    size1.width === size2.width && size1.height === size2.height;

export const rectsAreEqual = (rect1: Rect, rect2: Rect): boolean =>
    rect1.x === rect2.x && rect1.y === rect2.y && rect1.width === rect2.width && rect1.height === rect2.height;

export const isDOMRectContained = (inner: DOMRect, outer: DOMRect): boolean => {
    return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.y + inner.height <= outer.y + outer.height &&
        inner.x + inner.width <= outer.x + outer.width
    );
};
