import { computeQuantile } from "@modules/_shared/utils/math/statistics";

export type EmpiricalExceedancePoint = {
    value: number;
    countAbove: number;
    percentAbove: number;
};

export type DistributionSummary = {
    count: number;
    mean: number;
    median: number;
    /** Lower 10th percentile, using the petroleum P90 convention. */
    p90: number;
    /** Upper 90th percentile, using the petroleum P10 convention. */
    p10: number;
};

export type ThresholdCount = {
    countAbove: number;
    validCount: number;
};

export type BreakEvenTargetCount = {
    positiveCount: number;
    validCount: number;
};

export function computeEmpiricalExceedance(values: number[]): EmpiricalExceedancePoint[] {
    const sortedValues = values.filter(Number.isFinite).sort((left, right) => left - right);
    const points: EmpiricalExceedancePoint[] = [];
    let index = 0;

    while (index < sortedValues.length) {
        const value = sortedValues[index];
        let nextIndex = index + 1;
        while (sortedValues[nextIndex] === value) {
            nextIndex += 1;
        }
        const countAbove = sortedValues.length - nextIndex;
        points.push({ value, countAbove, percentAbove: (countAbove / sortedValues.length) * 100 });
        index = nextIndex;
    }

    return points;
}

export function computeDistributionSummary(values: number[]): DistributionSummary | null {
    const validValues = values.filter(Number.isFinite);
    if (validValues.length === 0) {
        return null;
    }

    const mean = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
    return {
        count: validValues.length,
        mean,
        median: computeQuantile(validValues, 0.5),
        p90: computeQuantile(validValues, 0.1),
        p10: computeQuantile(validValues, 0.9),
    };
}

export function countValuesAboveThreshold(values: number[], threshold: number): ThresholdCount {
    const validValues = values.filter(Number.isFinite);
    return {
        countAbove: validValues.filter((value) => value > threshold).length,
        validCount: validValues.length,
    };
}

/** Counts finite NPV values evaluated at the entered oil-price target. */
export function countPositiveNpvAtTarget(npvValues: number[]): BreakEvenTargetCount {
    const validValues = npvValues.filter(Number.isFinite);
    return {
        positiveCount: validValues.filter((value) => value > 0).length,
        validCount: validValues.length,
    };
}
