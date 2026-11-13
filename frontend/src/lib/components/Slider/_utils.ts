import { minBy } from "lodash-es";

import type { SnapTarget } from "./types";

export function isDualSliderValue(value: number | readonly number[]): value is readonly number[] {
    return Array.isArray(value);
}

export function getSnappedValue(
    sortedMarkers: number[],
    value: number | number[],
    target: SnapTarget,
): number | number[] {
    if (Array.isArray(value)) {
        return value.map((v) => getSnappedValue(sortedMarkers, v, target)) as number[];
    }

    switch (target) {
        case "nearest": {
            const closestMarker = minBy(sortedMarkers, (marker) => Math.abs(marker - value))!;
            return closestMarker;
        }
        case "next": {
            const nextMarker = sortedMarkers.find((marker) => marker >= value);
            return nextMarker !== undefined ? nextMarker : sortedMarkers[sortedMarkers.length - 1];
        }
        case "prev": {
            const prevMarker = sortedMarkers.findLast((marker) => marker <= value);
            return prevMarker !== undefined ? prevMarker : sortedMarkers[0];
        }
    }
}

export function getMarkerPercentage(value: number, min: number, max: number) {
    const range = max - min;

    if (range === 0) return 0;
    return ((value - min) / range) * 100;
}

export function getNearestThumbIndex(thumbValues: number | readonly number[], targetValue: number): 0 | 1 {
    // Mono-sliders only uses the thumb 0
    if (!isDualSliderValue(thumbValues)) return 0;

    // Target it outside the range; lower is always 0, higher is always 1
    if (targetValue <= thumbValues[0]) {
        return 0;
    }
    if (targetValue >= thumbValues[1]) {
        return 1;
    }

    // Target is between the thumbs, compute the closest one
    return minBy([0, 1], (idx) => Math.abs(thumbValues[idx] - targetValue))!;
}
