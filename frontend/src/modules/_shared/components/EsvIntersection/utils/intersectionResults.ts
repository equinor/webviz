import { FanchartIntersectedItem } from "../interaction/FanchartIntersectionCalculator";
import { LineIntersectedItem } from "../interaction/LineIntersectionCalculator";
import { LineSetIntersectedItem } from "../interaction/LineSetIntersectionCalculator";
import { PointIntersectedItem } from "../interaction/PointIntersectionCalculator";
import { PolygonIntersectedItem } from "../interaction/PolygonIntersectionCalculator";
import { PolygonsIntersectedItem } from "../interaction/PolygonsIntersectionCalculator";
import { WellborePathIntersectedItem } from "../interaction/WellborePathIntersectionCalculator";
import { IntersectedItem, IntersectionItemShape } from "../types/types";

export function isPointIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PointIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POINT;
}

export function isLineIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is LineIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.LINE;
}

export function isLineSetIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is LineSetIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.LINE_SET;
}

export function isPolygonIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POLYGON;
}

export function isPolygonsIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonsIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POLYGONS;
}

export function isWellborePathIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is WellborePathIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.WELLBORE_PATH;
}

export function isFanchartIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is FanchartIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.FANCHART;
}

export function isRectangleIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.RECTANGLE;
}
