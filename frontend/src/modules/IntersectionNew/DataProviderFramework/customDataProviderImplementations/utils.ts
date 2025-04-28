import type { Vec2 } from "@lib/utils/vec2";
import { normalizeVec2, point2Distance } from "@lib/utils/vec2";

/**
 * Create resampled polyline and provide the cumulated horizontal length per point in resampled polyline.
 *
 */
export function createResampledPolylinePointsAndCumulatedLengthArray(
    polylineUtmXy: number[],
    actualSectionLengths: number[],
    initialHorizontalPosition: number,
    sampledResolution: number,
): { xPoints: number[]; yPoints: number[]; cumulatedHorizontalPolylineLengthArr: number[] } {
    const xPoints: number[] = [];
    const yPoints: number[] = [];
    let cumulatedPolylineLength = initialHorizontalPosition;
    const cumulatedHorizontalPolylineLengthArr: number[] = [];
    for (let i = 0; i < polylineUtmXy.length; i += 2) {
        if (i > 0) {
            const distance = point2Distance(
                { x: polylineUtmXy[i], y: polylineUtmXy[i + 1] },
                { x: polylineUtmXy[i - 2], y: polylineUtmXy[i - 1] },
            );
            const actualDistance = actualSectionLengths[i / 2 - 1];
            const numPoints = Math.floor(distance / sampledResolution) - 1;
            const scale = actualDistance / distance;
            const scaledStepSize = sampledResolution * scale;

            const vector: Vec2 = {
                x: polylineUtmXy[i] - polylineUtmXy[i - 2],
                y: polylineUtmXy[i + 1] - polylineUtmXy[i - 1],
            };
            const normalizedVector = normalizeVec2(vector);
            for (let p = 1; p <= numPoints; p++) {
                xPoints.push(polylineUtmXy[i - 2] + normalizedVector.x * sampledResolution * p);
                yPoints.push(polylineUtmXy[i - 1] + normalizedVector.y * sampledResolution * p);
                cumulatedPolylineLength += scaledStepSize;
                cumulatedHorizontalPolylineLengthArr.push(cumulatedPolylineLength);
            }
        }

        xPoints.push(polylineUtmXy[i]);
        yPoints.push(polylineUtmXy[i + 1]);

        if (i > 0) {
            const distance = point2Distance(
                { x: polylineUtmXy[i], y: polylineUtmXy[i + 1] },
                { x: xPoints[xPoints.length - 1], y: yPoints[yPoints.length - 1] },
            );

            cumulatedPolylineLength += distance;
        }

        cumulatedHorizontalPolylineLengthArr.push(cumulatedPolylineLength);
    }

    return {
        xPoints,
        yPoints,
        cumulatedHorizontalPolylineLengthArr: cumulatedHorizontalPolylineLengthArr,
    };
}
