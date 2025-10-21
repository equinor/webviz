import { type Rgb } from "culori";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import type { PolygonData_api } from "@api";

export enum LabelPositionType {
    CENTROID = "centroid",
    CENTROID_SNAPPED = "centroidSnapped",
    FIRST_POINT = "firstPoint",
    LAST_POINT = "lastPoint",
}

export type TextLabelData = {
    coordinates: [number, number, number];
    name: string;
};

export type PolygonVisualizationSettings = {
    color?: string;
    lineThickness?: number;
    lineOpacity?: number;
    fill?: boolean;
    fillOpacity?: number;
    showLabels?: boolean;
    labelPosition?: LabelPositionType;
    labelColor?: string;
};
export type PolygonFeatureProperties = {
    name: string;
    polyId: string;
};

/**
 * Convert polygon coordinate arrays to deck.gl coordinate format
 */
export function zipCoords(xArr: readonly number[], yArr: readonly number[], zArr: readonly number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }
    return coords;
}

/**
 * Calculate the geometric centroid of a polygon
 */
export function calculatePolygonCentroid(
    xArr: readonly number[],
    yArr: readonly number[],
    zArr: readonly number[],
): [number, number, number] {
    if (xArr.length === 0) return [0, 0, 0];

    // Simple centroid calculation (average of all points)
    const sumX = xArr.reduce((sum, x) => sum + x, 0);
    const sumY = yArr.reduce((sum, y) => sum + y, 0);
    const sumZ = zArr.reduce((sum, z) => sum + z, 0);

    return [
        sumX / xArr.length,
        sumY / yArr.length,
        -sumZ / zArr.length, // Negative Z to match deck.gl convention
    ];
}

/**
 * Calculate distance between two 2D points
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Find the closest point on the polygon perimeter to a given position
 */
export function snapToClosestPoint(
    targetX: number,
    targetY: number,
    xArr: readonly number[],
    yArr: readonly number[],
    zArr: readonly number[],
): [number, number, number] {
    if (xArr.length === 0) return [0, 0, 0];

    let closestIndex = 0;
    let minDistance = calculateDistance(targetX, targetY, xArr[0], yArr[0]);

    for (let i = 1; i < xArr.length; i++) {
        const distance = calculateDistance(targetX, targetY, xArr[i], yArr[i]);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }

    return [xArr[closestIndex], yArr[closestIndex], -zArr[closestIndex]];
}

/**
 * Calculate label position based on the specified positioning strategy
 */
export function calculateLabelPosition(
    polygon: PolygonData_api,
    labelPosition: LabelPositionType,
): [number, number, number] {
    const { x_arr, y_arr, z_arr } = polygon;

    switch (labelPosition) {
        case LabelPositionType.CENTROID:
            return calculatePolygonCentroid(x_arr, y_arr, z_arr);

        case LabelPositionType.CENTROID_SNAPPED: {
            const centroid = calculatePolygonCentroid(x_arr, y_arr, z_arr);
            return snapToClosestPoint(centroid[0], centroid[1], x_arr, y_arr, z_arr);
        }

        case LabelPositionType.FIRST_POINT:
            return x_arr.length > 0 ? [x_arr[0], y_arr[0], -z_arr[0]] : [0, 0, 0];

        case LabelPositionType.LAST_POINT:
            return x_arr.length > 0
                ? [x_arr[x_arr.length - 1], y_arr[y_arr.length - 1], -z_arr[z_arr.length - 1]]
                : [0, 0, 0];

        default:
            return calculatePolygonCentroid(x_arr, y_arr, z_arr);
    }
}

/**
 * Convert PolygonData_api to GeoJSON feature
 */
export function polygonsToGeojson(polygons: PolygonData_api): Feature<Geometry, PolygonFeatureProperties> {
    const data: Feature<Geometry, PolygonFeatureProperties> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(polygons.x_arr, polygons.y_arr, polygons.z_arr)],
        },
        properties: {
            name: polygons.name || "Unnamed",
            polyId: polygons.poly_id as string,
        },
    };
    return data;
}

/**
 * Convert polygon data to GeoJSON FeatureCollection
 */
export function createPolygonFeatureCollection(
    data: PolygonData_api[],
): FeatureCollection<Geometry, PolygonFeatureProperties> {
    const features: Feature<Geometry, PolygonFeatureProperties>[] = data.map(polygonsToGeojson);

    return {
        type: "FeatureCollection",
        features: features,
    };
}

/**
 * Create text label data from polygon data
 */
export function createTextLabelData(
    data: PolygonData_api[],
    labelPosition: LabelPositionType = LabelPositionType.CENTROID,
): TextLabelData[] {
    return data.map((polygon) => {
        const coordinates = calculateLabelPosition(polygon, labelPosition);
        return {
            coordinates,
            name: polygon.name || "Unnamed",
        };
    });
}

export function calculateLuminanceFromRgb(rgbColor: Rgb): number {
    // Calculate relative luminance
    // https://en.wikipedia.org/wiki/Relative_luminance
    return 0.2126 * rgbColor.r + 0.7152 * rgbColor.g + 0.0722 * rgbColor.b;
}

export function calculateBackgroundColorFromLuminance(luminance: number): Rgb {
    // Return black or white based on luminance threshold
    return luminance > 0.5 ? { mode: "rgb", r: 0, g: 0, b: 0 } : { mode: "rgb", r: 1, g: 1, b: 1 };
}

export function calculateBackgroundColorForColor(rgbColor: Rgb): Rgb {
    const luminance = calculateLuminanceFromRgb(rgbColor);
    return calculateBackgroundColorFromLuminance(luminance);
}
