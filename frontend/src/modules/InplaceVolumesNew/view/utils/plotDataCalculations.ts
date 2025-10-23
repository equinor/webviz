import { sortBy } from "lodash";

import { BarSortBy } from "../../settings/components/inplaceVolumesPlotOptionsDialog";

/**
 * Sort bar plot data points based on the specified sort option
 * @param dataPoints - Array of data points with x and y values
 * @param barSortBy - Sort option (by X values or Y values)
 * @returns Sorted array of data points
 */
export function sortBarPlotData<T extends { x: string | number; y: string | number }>(
    dataPoints: T[],
    barSortBy: BarSortBy,
): T[] {
    if (barSortBy === BarSortBy.Xvalues) {
        // Sort by x values (ascending)
        return sortBy(dataPoints, (point) => {
            // Handle both string and numeric values
            return typeof point.x === "string" ? point.x.toLowerCase() : point.x;
        });
    } else {
        // Sort by y values (descending)
        return sortBy(dataPoints, (point) => -Number(point.y));
    }
}

/**
 * Calculate global axis ranges from multiple traces
 * @param allTraces - Array of trace arrays from all subplots
 * @returns Object with xRange and yRange, undefined if no valid data
 */
export function calculateGlobalRanges(allTraces: Plotly.Data[][]): {
    xRange: [number, number] | undefined;
    yRange: [number, number] | undefined;
} {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    allTraces.forEach((traces) => {
        traces.forEach((trace) => {
            // Handle x values - use type assertion since we know our traces have x/y
            const traceWithXY = trace as { x?: (number | string)[]; y?: (number | string)[] };

            if (traceWithXY.x && Array.isArray(traceWithXY.x)) {
                traceWithXY.x.forEach((val: number | string) => {
                    const numVal = typeof val === "number" ? val : parseFloat(String(val));
                    if (!isNaN(numVal)) {
                        xMin = Math.min(xMin, numVal);
                        xMax = Math.max(xMax, numVal);
                    }
                });
            }

            // Handle y values
            if (traceWithXY.y && Array.isArray(traceWithXY.y)) {
                traceWithXY.y.forEach((val: number | string) => {
                    const numVal = typeof val === "number" ? val : parseFloat(String(val));
                    if (!isNaN(numVal)) {
                        yMin = Math.min(yMin, numVal);
                        yMax = Math.max(yMax, numVal);
                    }
                });
            }
        });
    });

    const xRange = xMin !== Infinity && xMax !== -Infinity ? ([xMin, xMax] as [number, number]) : undefined;
    const yRange = yMin !== Infinity && yMax !== -Infinity ? ([yMin, yMax] as [number, number]) : undefined;

    return { xRange, yRange };
}
/**
 * Check if all values in an array are equal (within floating point precision)
 *
 * @param values - Array of numbers to check
 * @returns true if all values are effectively equal, false otherwise
 *
 * @example
 * allValuesEqual([1, 1, 1]) // true
 * allValuesEqual([1.0000000001, 1.0000000002]) // true (within epsilon)
 * allValuesEqual([1, 2, 3]) // false
 * allValuesEqual([]) // true (empty array is considered equal)
 * allValuesEqual([5]) // true (single value is considered equal)
 */
export function allValuesEqual(values: number[]): boolean {
    if (values.length <= 1) {
        return true;
    }

    const first = values[0];
    const epsilon = 1e-10; // Tolerance for floating point comparison

    return values.every((v) => Math.abs(v - first) < epsilon);
}
