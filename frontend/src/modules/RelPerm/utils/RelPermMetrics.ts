import { RelPermMetric, type RelPermCurveEntry } from "../typesAndEnums";

export function calculateRelPermMetric(entry: RelPermCurveEntry, metric: RelPermMetric): number | null {
    if (entry.curveValues.length === 0) {
        return null;
    }

    if (metric === RelPermMetric.ENDPOINT_MAX) {
        return Math.max(...entry.curveValues);
    }

    if (metric === RelPermMetric.ENDPOINT_MIN) {
        return Math.min(...entry.curveValues);
    }

    if (metric === RelPermMetric.AREA_UNDER_CURVE) {
        return calculateAreaUnderCurve(entry.saturationValues, entry.curveValues);
    }

    if (metric === RelPermMetric.MEAN_CURVE_VALUE) {
        return calculateMeanCurveValue(entry.saturationValues, entry.curveValues);
    }

    return null;
}

function calculateMeanCurveValue(xValues: number[], yValues: number[]): number | null {
    const area = calculateAreaUnderCurve(xValues, yValues);
    if (area === null) {
        return null;
    }

    const sortedPoints = makeSortedCurvePoints(xValues, yValues);
    if (!sortedPoints) {
        return null;
    }

    const intervalWidth = sortedPoints[sortedPoints.length - 1].x - sortedPoints[0].x;
    if (intervalWidth === 0) {
        return null;
    }

    return area / intervalWidth;
}

function calculateAreaUnderCurve(xValues: number[], yValues: number[]): number | null {
    const sortedPoints = makeSortedCurvePoints(xValues, yValues);
    if (!sortedPoints) {
        return null;
    }

    let area = 0;
    for (let index = 1; index < sortedPoints.length; index++) {
        const width = sortedPoints[index].x - sortedPoints[index - 1].x;
        const averageHeight = (sortedPoints[index].y + sortedPoints[index - 1].y) / 2;
        area += width * averageHeight;
    }

    return area;
}

function makeSortedCurvePoints(xValues: number[], yValues: number[]): { x: number; y: number }[] | null {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        return null;
    }

    const points = xValues.map((x, index) => ({ x, y: yValues[index] }));
    if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        return null;
    }

    return points.sort((left, right) => left.x - right.x);
}
