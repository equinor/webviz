import type { ReferenceLineShape } from "../../types";

/**
 * Maps a `ReferenceLineShape` to the corresponding ECharts `step` value.
 * Returns `null` for "linear" (no step).
 */
export function mapLineShapeToStep(lineShape: ReferenceLineShape | undefined): "start" | "end" | null {
    if (lineShape === "vh") return "start";
    if (lineShape === "hv") return "end";
    return null;
}

/**
 * Generate `[categoryIndex, value]` coordinate pairs that render the same step
 * polyline geometry as ECharts' native `step` line option.
 *
 * - `step === null`: one point per value.
 * - `step === "end"` (i.e. `hv`): horizontal segment holds the previous value
 *   then jumps vertically at the next category.
 * - `step === "start"` (i.e. `vh`): vertical jump at the previous category then
 *   horizontal segment at the new value.
 */
export function makeSteppedCategoryCoords(values: number[], step: "start" | "end" | null): number[][] {
    const numValues = values.length;
    const points: number[][] = [];
    if (numValues === 0) return points;

    if (step === null) {
        for (let index = 0; index < numValues; index++) {
            points.push([index, values[index]]);
        }
        return points;
    }

    if (step === "end") {
        points.push([0, values[0]]);
        for (let index = 1; index < numValues; index++) {
            points.push([index, values[index - 1]]);
            points.push([index, values[index]]);
        }
        return points;
    }

    // step === "start"
    points.push([0, values[0]]);
    for (let index = 1; index < numValues; index++) {
        points.push([index - 1, values[index]]);
        points.push([index, values[index]]);
    }
    return points;
}
