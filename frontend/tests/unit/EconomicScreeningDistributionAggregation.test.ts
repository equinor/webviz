import { describe, expect, test } from "vitest";

import {
    computeEmpiricalExceedance,
    computeDistributionSummary,
    countValuesAboveThreshold,
    countPositiveNpvAtBreakEvenTarget,
} from "@modules/EconomicScreening/utils/distributionAggregation";

describe("computeEmpiricalExceedance", () => {
    test("groups tied values and uses the strict greater-than definition", () => {
        expect(computeEmpiricalExceedance([30, 10, 30, 20])).toEqual([
            { value: 10, countAbove: 3, percentAbove: 75 },
            { value: 20, countAbove: 2, percentAbove: 50 },
            { value: 30, countAbove: 0, percentAbove: 0 },
        ]);
    });

    test("returns no points for an empty distribution", () => {
        expect(computeEmpiricalExceedance([])).toEqual([]);
    });
});

describe("computeDistributionSummary", () => {
    test("uses petroleum percentile naming and reports finite values only", () => {
        expect(computeDistributionSummary([NaN, 10, 20, 30, Infinity])).toEqual({
            count: 3,
            mean: 20,
            median: 20,
            p90: 12,
            p10: 28,
        });
    });

    test("returns null for no valid results", () => {
        expect(computeDistributionSummary([])).toBeNull();
    });
});

describe("countValuesAboveThreshold", () => {
    test("uses strict threshold counting with a finite-value denominator", () => {
        expect(countValuesAboveThreshold([-1, 0, 1, NaN], 0)).toEqual({ countAbove: 1, validCount: 3 });
    });
});

describe("countPositiveNpvAtBreakEvenTarget", () => {
    test("uses signed oil volumes to evaluate NPV at the target price", () => {
        expect(
            countPositiveNpvAtBreakEvenTarget(
                [
                    { discountedOilVolume: 10, breakEvenOilPrice: 50 },
                    { discountedOilVolume: -10, breakEvenOilPrice: 50 },
                    { discountedOilVolume: 0, breakEvenOilPrice: null },
                ],
                60,
            ),
        ).toEqual({ positiveCount: 1, validCount: 2 });
    });
});
