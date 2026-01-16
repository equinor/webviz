import { computeReservesP10, computeReservesP50, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

/**
 * Statistics computed for a set of values.
 * These are the core statistics used across plots and tables.
 */
export interface Statistics {
    count: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p10: number;
    p50: number;
    p90: number;
}

/**
 * Computes statistics for an array of numeric values.
 * Uses sample standard deviation (ddof=1) consistent with Polars.
 */
export function computeStatistics(values: number[]): Statistics {
    if (values.length === 0) {
        return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, p10: 0, p50: 0, p90: 0 };
    }

    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;

    // Use sample standard deviation (ddof=1) like Polars
    const variance = count > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1) : 0;
    const stdDev = Math.sqrt(variance);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const p10 = computeReservesP10(values);
    const p50 = computeReservesP50(values);
    const p90 = computeReservesP90(values);

    return { count, mean, stdDev, min, max, p10, p50, p90 };
}

/**
 * Checks if values are constant (all the same value).
 */
export function isConstant(values: number[]): boolean {
    if (values.length === 0) {
        return true;
    }
    const firstValue = values[0];
    return values.every((v) => v === firstValue);
}
