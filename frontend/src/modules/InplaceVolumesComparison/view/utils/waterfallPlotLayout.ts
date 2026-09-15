import type { VolumeChangeDecomposition } from "./computeVolumeChangeDecomposition";

/**
 * Y-axis range for a waterfall's cumulative bars, padded so the bars don't touch the plot edges.
 *
 * @param decomposition - The decomposition to size the axis for.
 * @returns A `[low, high]` range.
 */
export function makeYAxisRange(decomposition: VolumeChangeDecomposition): [number, number] {
    const cumulatives = decomposition.bars.map((bar) => bar.cumulative);
    const cumulativeMin = Math.min(...cumulatives);
    const cumulativeMax = Math.max(...cumulatives);
    const range = cumulativeMax - cumulativeMin;
    const padding = range !== 0 ? range / 2 : Math.abs(cumulativeMax) * 0.1 || 1;
    return [cumulativeMin - padding, cumulativeMax + padding];
}

/**
 * Subplot grid dimensions that fit the given number of subplots as close to a square as possible.
 *
 * @param numSubplots - Number of subplots to lay out.
 * @returns The number of rows and columns to use.
 */
export function calcNumRowsAndCols(numSubplots: number): { numRows: number; numCols: number } {
    if (numSubplots < 1) {
        return { numRows: 1, numCols: 1 };
    }
    const numRows = Math.ceil(Math.sqrt(numSubplots));
    const numCols = Math.ceil(numSubplots / numRows);
    return { numRows, numCols };
}
