import { describe, expect, test } from "vitest";

import {
    computeEmpiricalExceedance,
    computeDistributionSummary,
    countValuesAboveThreshold,
    countPositiveNpvAtTarget,
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

describe("countPositiveNpvAtTarget", () => {
    test("includes finite gas-only and zero-oil financial results", () => {
        expect(countPositiveNpvAtTarget([100, -100, 25, Number.NaN])).toEqual({ positiveCount: 2, validCount: 3 });
    });
});
