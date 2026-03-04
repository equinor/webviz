import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import type { TimeseriesStatistics } from "../typesAndEnums";

/**
 * Sum multiple `number[][]` (valuesPerRealization) arrays element-wise.
 * Used to combine per-region values when grouping by zone/ensemble etc.
 *
 * @param arrays - Array of shape [N][numReals][numTimesteps]
 * @returns Single array of shape [numReals][numTimesteps], or null if empty.
 */
export function sumValuesArrays(arrays: number[][][]): number[][] | null {
    if (arrays.length === 0) return null;
    if (arrays.length === 1) return arrays[0];

    const numReals = arrays[0].length;
    const numTimesteps = numReals > 0 ? arrays[0][0].length : 0;

    const result: number[][] = Array.from({ length: numReals }, () => new Array(numTimesteps).fill(0));

    for (const arr of arrays) {
        for (let r = 0; r < numReals; r++) {
            for (let t = 0; t < numTimesteps; t++) {
                result[r][t] += arr[r][t];
            }
        }
    }

    return result;
}

/**
 * Compute statistics (mean, P10, P50, P90, min, max) across realizations
 * for each timestep.  P10/P90 use the reserves/exceedance convention.
 *
 * @param valuesPerRealization - Shape [numReals][numTimesteps]
 * @returns TimeseriesStatistics with arrays of length numTimesteps
 */
export function computeStatistics(valuesPerRealization: number[][]): TimeseriesStatistics {
    const numReals = valuesPerRealization.length;
    const numTimesteps = numReals > 0 ? valuesPerRealization[0].length : 0;

    const mean = new Array<number>(numTimesteps).fill(0);
    const p10 = new Array<number>(numTimesteps).fill(0);
    const p50 = new Array<number>(numTimesteps).fill(0);
    const p90 = new Array<number>(numTimesteps).fill(0);
    const min = new Array<number>(numTimesteps).fill(0);
    const max = new Array<number>(numTimesteps).fill(0);

    if (numReals === 0) {
        return { mean, p10, p50, p90, min, max };
    }

    for (let t = 0; t < numTimesteps; t++) {
        const col: number[] = [];
        let sum = 0;
        for (let r = 0; r < numReals; r++) {
            const v = valuesPerRealization[r][t];
            col.push(v);
            sum += v;
        }

        mean[t] = sum / numReals;
        min[t] = Math.min(...col);
        max[t] = Math.max(...col);
        p10[t] = computeReservesP10(col);
        p50[t] = computeP50(col);
        p90[t] = computeReservesP90(col);
    }

    return { mean, p10, p50, p90, min, max };
}

/**
 * Compute recovery factor: (initial - current) / initial
 * where "initial" is the value at the first timestep.
 *
 * @param valuesPerRealization - Shape [numReals][numTimesteps]
 * @returns New valuesPerRealization with recovery factors, same shape.
 */
export function computeRecoveryFactor(valuesPerRealization: number[][]): number[][] {
    return valuesPerRealization.map((realValues) => {
        const initial = realValues[0];
        if (initial === 0 || initial == null) {
            // Avoid division by zero
            return realValues.map(() => 0);
        }
        return realValues.map((v) => (initial - v) / initial);
    });
}

/**
 * Build histogram bin data from an array of values.
 * @param values - The array of values to bin
 * @param numBins - Number of bins (default 15)
 * @returns Array of { binCenter, binLabel, count }
 */
export function buildHistogramData(
    values: number[],
    numBins = 15,
): { binCenter: number; binLabel: string; count: number }[] {
    if (values.length === 0) return [];

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Handle edge case where all values are the same
    if (minVal === maxVal) {
        return [{ binCenter: minVal, binLabel: minVal.toFixed(1), count: values.length }];
    }

    const binWidth = (maxVal - minVal) / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => ({
        binCenter: minVal + (i + 0.5) * binWidth,
        binLabel: `${(minVal + i * binWidth).toFixed(1)}`,
        count: 0,
    }));

    for (const v of values) {
        let idx = Math.floor((v - minVal) / binWidth);
        if (idx >= numBins) idx = numBins - 1; // clamp max value
        bins[idx].count++;
    }

    return bins;
}
