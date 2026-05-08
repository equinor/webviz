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

    return null;
}

function calculateAreaUnderCurve(xValues: number[], yValues: number[]): number | null {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        return null;
    }

    let area = 0;
    for (let index = 1; index < xValues.length; index++) {
        const width = Math.abs(xValues[index] - xValues[index - 1]);
        const averageHeight = (yValues[index] + yValues[index - 1]) / 2;
        area += width * averageHeight;
    }

    return area;
}
