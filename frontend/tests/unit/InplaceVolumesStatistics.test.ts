import { describe, expect, test } from "vitest";

import { computeStatistics } from "@modules/_shared/utils/math/statistics";

describe("computeStatistics", function statisticsTests() {
    test("excludes missing samples from all statistics without mutating the input", function excludesMissingSamples() {
        const values = [10, NaN, 20, Infinity, -Infinity];
        const originalValues = [...values];

        expect(computeStatistics(values)).toEqual(computeStatistics([10, 20]));
        expect(computeStatistics(values).count).toBe(2);
        expect(values).toEqual(originalValues);
    });

    test("does not count API nulls as zeros", function excludesApiNulls() {
        const values = JSON.parse("[null, 0.1, null]");

        expect(computeStatistics(values)).toEqual(computeStatistics([0.1]));
    });

    test("keeps genuine zeros", function keepsZeros() {
        const statistics = computeStatistics([0, NaN, 10]);

        expect(statistics.count).toBe(2);
        expect(statistics.mean).toBe(5);
        expect(statistics.min).toBe(0);
    });

    test("returns undefined statistics when every sample is missing", function handlesMissingSamples() {
        expect(computeStatistics([NaN, Infinity, -Infinity])).toEqual({
            count: 0,
            mean: NaN,
            stdDev: NaN,
            min: NaN,
            max: NaN,
            p10: NaN,
            p50: NaN,
            p90: NaN,
        });
    });
});
