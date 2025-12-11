import { rotatePoint2Around, vec2ToArray, type Vec2 } from "@lib/utils/vec2";
import type { Geometry } from "geojson";

const PERFORATION_WIDTH = 2;
const PERFORATION_OFFSET = 4;
const PERFORATION_HEIGHT = 25;

const SCREEN_HEIGHT = 10;
const SCREEN_INDENT = 3;

function getRotatedPoint(point: Vec2, pivotPoint: Vec2, rotation: number) {
    const rotatedPoint = rotatePoint2Around(point, pivotPoint, rotation);
    return vec2ToArray(rotatedPoint);
}

function buildPerforationTrianglePolygonCoordinates(anchorPoint: Vec2, rotation: number) {
    const point1 = { x: anchorPoint.x, y: anchorPoint.y + (PERFORATION_HEIGHT + PERFORATION_OFFSET) };
    const point2 = { x: anchorPoint.x - PERFORATION_WIDTH, y: anchorPoint.y + PERFORATION_OFFSET };
    const point3 = { x: anchorPoint.x + PERFORATION_WIDTH, y: anchorPoint.y + PERFORATION_OFFSET };

    const rotatedPoint1 = getRotatedPoint(point1, anchorPoint, rotation);
    const rotatedPoint2 = getRotatedPoint(point2, anchorPoint, rotation);
    const rotatedPoint3 = getRotatedPoint(point3, anchorPoint, rotation);

    return [rotatedPoint1, rotatedPoint2, rotatedPoint3, rotatedPoint1];
}

export function buildPerforationMarkerGeology(point: Vec2, rotation: number): Geometry {
    return {
        type: "MultiPolygon",
        coordinates: [
            [buildPerforationTrianglePolygonCoordinates(point, rotation)],
            [buildPerforationTrianglePolygonCoordinates(point, rotation + Math.PI)],
        ],
    };
}

function buildScreenMarkerLineCoordinates(anchorPoint: Vec2, rotation: number, type: "start" | "end") {
    if (type === "end") rotation += Math.PI;

    const pointAbove = { x: anchorPoint.x + SCREEN_INDENT, y: anchorPoint.y + SCREEN_HEIGHT };
    const pointCenter = { x: anchorPoint.x, y: anchorPoint.y };
    const pointBelow = { x: anchorPoint.x + SCREEN_INDENT, y: anchorPoint.y - SCREEN_HEIGHT };

    return [
        getRotatedPoint(pointAbove, anchorPoint, rotation),
        [pointCenter.x, pointCenter.y],
        getRotatedPoint(pointBelow, anchorPoint, rotation),
    ];
}

export function buildScreenMarkerGeology(anchorPoint: Vec2, rotation: number, type: "start" | "end"): Geometry {
    return {
        type: "LineString",
        coordinates: buildScreenMarkerLineCoordinates(anchorPoint, rotation, type),
    };
}
