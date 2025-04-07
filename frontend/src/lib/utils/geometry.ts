import { BBox } from "./bbox";
import type { Vec2 } from "./vec2";
import { Vec3 } from "./vec3";

export type Size2D = {
    width: number;
    height: number;
};

export type Size3D = {
    width: number;
    height: number;
    depth: number;
};

export type Rect2D = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type Rect3D = {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
};

export enum ShapeType {
    BOX = "box",
}

export type Shape = {
    type: ShapeType.BOX;
    centerPoint: Vec3;
    dimensions: Size3D;
    normalizedEdgeVectors: {
        // along width
        u: Vec3;
        // along height
        v: Vec3;
    };
};

export type Geometry = {
    shapes: Shape[];
    boundingBox: BBox;
};

export const ORIGIN = Object.freeze({ x: 0, y: 0 });
export const MANHATTAN_LENGTH = 13.11;

export function isPartlyContained(
    centerPoint1: Vec2,
    dimensions1: Size2D,
    centerPoint2: Vec2,
    dimensions2: Size2D,
): boolean {
    return !(
        centerPoint1.x + dimensions1.width / 2 < centerPoint2.x - dimensions2.width / 2 ||
        centerPoint1.x - dimensions1.width / 2 > centerPoint2.x + dimensions2.width / 2 ||
        centerPoint1.y + dimensions1.height / 2 < centerPoint2.y - dimensions2.height / 2 ||
        centerPoint1.y - dimensions1.height / 2 > centerPoint2.y + dimensions2.height / 2
    );
}

export function pointIsContained(point: Vec2, dimensions: Size2D, centerPoint: Vec2): boolean {
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

export function rectContainsPoint(rect: Rect2D, point: Vec2): boolean {
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

export function outerRectContainsInnerRect(outerRect: Rect3D, innerRect: Rect3D): boolean;
export function outerRectContainsInnerRect(outerRect: Rect2D, innerRect: Rect2D): boolean;
export function outerRectContainsInnerRect(outerRect: Rect2D | Rect3D, innerRect: Rect2D | Rect3D): boolean {
    if ("depth" in outerRect && "depth" in innerRect) {
        return (
            outerRect.x <= innerRect.x &&
            outerRect.y <= innerRect.y &&
            outerRect.z <= innerRect.z &&
            outerRect.x + outerRect.width >= innerRect.x + innerRect.width &&
            outerRect.y + outerRect.height >= innerRect.y + innerRect.height &&
            outerRect.z + outerRect.depth >= innerRect.z + innerRect.depth
        );
    }

    return (
        outerRect.x <= innerRect.x &&
        outerRect.y <= innerRect.y &&
        outerRect.x + outerRect.width >= innerRect.x + innerRect.width &&
        outerRect.y + outerRect.height >= innerRect.y + innerRect.height
    );
}

export function pointRelativeToDomRect(point: Vec2, domRect: DOMRect): Vec2 {
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

export function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}
