import { Controller, Layer } from "@equinor/esv-intersection";

import {
    isFanchartIntersectionResult,
    isLineIntersectionResult,
    isLineSetIntersectionResult,
    isPointIntersectionResult,
    isPolygonIntersectionResult,
    isPolygonsIntersectionResult,
    isRectangleIntersectionResult,
    isWellborePathIntersectionResult,
} from "./intersectionResults";
import {
    isCalloutCanvasLayer,
    isPolylineIntersectionLayer,
    isSchematicLayer,
    isSeismicCanvasLayer,
    isSeismicLayer,
    isStatisticalFanchartsCanvasLayer,
    isSurfaceLayer,
    isWellborepathLayer,
} from "./layers";

import { FanchartIntersectionCalculator } from "../interaction/FanchartIntersectionCalculator";
import { IntersectionHandlerOptions } from "../interaction/IntersectionHandler";
import { LineIntersectionCalculator } from "../interaction/LineIntersectionCalculator";
import { LineSetIntersectionCalculator } from "../interaction/LineSetIntersectionCalculator";
import { PointIntersectionCalculator } from "../interaction/PointIntersectionCalculator";
import { PolygonIntersectionCalculator } from "../interaction/PolygonIntersectionCalculator";
import { PolygonsIntersectionCalculator } from "../interaction/PolygonsIntersectionCalculator";
import { RectangleIntersectionCalculator } from "../interaction/RectangleIntersectionCalculator";
import { WellborePathIntersectionCalculator } from "../interaction/WellborePathIntersectionCalculator";
import {
    HighlightItem,
    HighlightItemShape,
    IntersectedItem,
    IntersectionCalculator,
    IntersectionItem,
    IntersectionItemShape,
    ReadoutItem,
} from "../types/types";

export function makeIntersectionCalculatorFromIntersectionItem(
    intersectionItem: IntersectionItem,
    options: IntersectionHandlerOptions,
    controller: Controller
): IntersectionCalculator {
    switch (intersectionItem.shape) {
        case IntersectionItemShape.POINT:
            return new PointIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.LINE:
            return new LineIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.LINE_SET:
            return new LineSetIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.POLYGON:
            return new PolygonIntersectionCalculator(intersectionItem.data);
        case IntersectionItemShape.POLYGONS:
            return new PolygonsIntersectionCalculator(intersectionItem.data);
        case IntersectionItemShape.WELLBORE_PATH:
            return new WellborePathIntersectionCalculator(controller, options.threshold);
        case IntersectionItemShape.FANCHART:
            return new FanchartIntersectionCalculator(
                intersectionItem.data.lines,
                intersectionItem.data.hull,
                options.threshold
            );
        case IntersectionItemShape.RECTANGLE:
            return new RectangleIntersectionCalculator(intersectionItem.data);
    }
}

export function getColorFromLayerData(layer: Layer<unknown>, index: number): string {
    if (isSurfaceLayer(layer) && layer.data) {
        if (layer.data.lines && layer.data.lines[index] && layer.data.lines[index].color) {
            return layer.data.lines[index].color.toString();
        }
    }

    if (isPolylineIntersectionLayer(layer) && layer.data) {
        return "rgba(255, 255, 255, 0.75)";
    }

    if (isStatisticalFanchartsCanvasLayer(layer) && layer.data) {
        return layer.data.fancharts[index].color ?? "#000";
    }

    if (isCalloutCanvasLayer(layer) && layer.data) {
        return layer.data[index].color;
    }

    if (isWellborepathLayer(layer)) {
        return "rgb(255, 0, 0)";
    }

    if (isSchematicLayer(layer)) {
        return "#000";
    }

    if (isSeismicCanvasLayer(layer)) {
        return "rgba(0, 0, 255, 0.3)";
    }

    if (isSeismicLayer(layer)) {
        return "rgba(0, 0, 0, 0.6)";
    }

    return "#000";
}

export function makeHighlightItemFromIntersectionResult(
    intersectionResult: IntersectedItem,
    layer: Layer<unknown>,
    index: number
): HighlightItem {
    const color = getColorFromLayerData(layer, index);
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            paintOrder: layer.order,
            color,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            paintOrder: layer.order,
            color,
        };
    }
    if (isLineSetIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINTS,
            points: intersectionResult.points,
            paintOrder: layer.order,
            color,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POLYGON,
            polygon: intersectionResult.polygon,
            paintOrder: layer.order,
            color,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        if (!isPolylineIntersectionLayer(layer) || !layer.data) {
            return {
                shape: HighlightItemShape.POLYGON,
                polygon: intersectionResult.polygon,
                paintOrder: layer.order,
                color,
            };
        }
        const cellIndex = layer.data.fenceMeshSections[index].polySourceCellIndicesArr[intersectionResult.polygonIndex];
        const polygons = layer.extractPolygonsForCellIndex(cellIndex);
        return {
            shape: HighlightItemShape.POLYGONS,
            polygons,
            paintOrder: layer.order,
            color,
        };
    }
    if (isWellborePathIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            paintOrder: layer.order,
            color,
        };
    }
    if (isFanchartIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.LINE,
            line: intersectionResult.line,
            paintOrder: layer.order,
            color,
        };
    }
    if (isRectangleIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.CROSS,
            center: intersectionResult.point,
            paintOrder: layer.order,
            color,
        };
    }
    throw new Error("Invalid intersection result");
}

export function makeReadoutItemFromIntersectionResult(
    intersectionResult: IntersectedItem,
    layer: Layer<unknown>,
    index: number
): ReadoutItem {
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isLineSetIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            points: intersectionResult.points,
            layer,
            index,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
            polygonIndex: intersectionResult.polygonIndex,
        };
    }
    if (isWellborePathIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            md: intersectionResult.md,
            layer,
            index,
        };
    }
    if (isFanchartIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            points: intersectionResult.points,
            layer,
            index,
        };
    }
    if (isRectangleIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    throw new Error("Invalid intersection result");
}
