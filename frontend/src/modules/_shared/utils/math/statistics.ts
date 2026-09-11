export function computeQuantile(data: number[], quantile: number): number {
    // Compute the quantile of a dataset

    if (quantile < 0 || quantile > 1) {
        throw new Error(`Quantile must be between 0 and 1, but got ${quantile}`);
    }
    if (data.length === 0) {
        return 0;
    }
    if (data.length === 1) {
        return data[0];
    }
    const sortedValues = [...data].sort((a, b) => a - b);

    // Calculate the index, which may be a decimal.
    const rank = (sortedValues.length - 1) * quantile;

    if (Number.isInteger(rank)) {
        // If the index is an integer, no interpolation is needed
        return sortedValues[rank];
    } else {
        // If the index is not an integer, we interpolate between the two nearest values
        const lowerRank = Math.floor(rank);
        const fraction = rank - lowerRank;
        return sortedValues[lowerRank] * (1 - fraction) + sortedValues[lowerRank + 1] * fraction;
    }
}

export function computeReservesP90(data: number[]): number {
    // P90: Conservative estimate - 90% probability of at least this value
    // This is the 10th percentile (low value)
    return computeQuantile(data, 0.1);
}

export function computeReservesP10(data: number[]): number {
    // P10: Optimistic estimate - 10% probability of at least this value
    // This is the 90th percentile (high value)
    return computeQuantile(data, 0.9);
}

export function computeP50(data: number[]): number {
    // P50: Median estimate - 50% probability of at least this value
    // This is the 50th percentile (median)
    return computeQuantile(data, 0.5);
}

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
 * Computes statistics for the finite values in an array, excluding missing and non-finite samples.
 * Uses sample standard deviation (ddof=1) consistent with Polars, so client-side statistics match
 * the ones the backend computes.
 */
export function computeStatistics(values: number[]): Statistics {
    const finiteValues = values.filter(Number.isFinite);
    if (finiteValues.length === 0) {
        // NaN rather than zero: zero is a valid volume, not a missing result.
        return {
            count: 0,
            mean: Number.NaN,
            stdDev: Number.NaN,
            min: Number.NaN,
            max: Number.NaN,
            p10: Number.NaN,
            p50: Number.NaN,
            p90: Number.NaN,
        };
    }

    const count = finiteValues.length;
    const mean = finiteValues.reduce((sum, value) => sum + value, 0) / count;

    const stdDev =
        count > 1
            ? Math.sqrt(finiteValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (count - 1))
            : Number.NaN;

    const min = finiteValues.reduce((minimum, value) => Math.min(minimum, value), Infinity);
    const max = finiteValues.reduce((maximum, value) => Math.max(maximum, value), -Infinity);
    const p10 = computeReservesP10(finiteValues);
    const p50 = computeP50(finiteValues);
    const p90 = computeReservesP90(finiteValues);

    return { count, mean, stdDev, min, max, p10, p50, p90 };
}
