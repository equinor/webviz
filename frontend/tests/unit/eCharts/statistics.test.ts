import { describe, expect, it } from "vitest";

import { computePointStatistics, computeTimeseriesStatistics } from "@modules/_shared/eCharts/utils/statistics";

describe("computePointStatistics", () => {
    it("returns zeroed stats for empty input", () => {
        const stats = computePointStatistics([]);
        expect(stats.count).toBe(0);
        expect(stats.mean).toBe(0);
        expect(stats.stdDev).toBe(0);
    });

    it("computes correct stats for a single value", () => {
        const stats = computePointStatistics([5]);
        expect(stats.count).toBe(1);
        expect(stats.mean).toBe(5);
        expect(stats.stdDev).toBe(0);
        expect(stats.min).toBe(5);
        expect(stats.max).toBe(5);
    });

    it("computes mean, stdDev, min, max for known data", () => {
        const stats = computePointStatistics([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(stats.count).toBe(8);
        expect(stats.mean).toBe(5);
        expect(stats.min).toBe(2);
        expect(stats.max).toBe(9);
        expect(stats.stdDev).toBeCloseTo(2, 0);
    });

    it("computes p10/p50/p90 percentiles", () => {
        // 1..10 uniform — p50 should be ~5.5
        const values = Array.from({ length: 10 }, (_, i) => i + 1);
        const stats = computePointStatistics(values);
        expect(stats.p50).toBeCloseTo(5.5, 1);
        expect(stats.p10).toBeGreaterThan(stats.p90); // reserves convention: p10 > p90
    });

    it("handles negative values", () => {
        const stats = computePointStatistics([-10, -5, 0, 5, 10]);
        expect(stats.mean).toBe(0);
        expect(stats.min).toBe(-10);
        expect(stats.max).toBe(10);
    });
});

describe("computeTimeseriesStatistics", () => {
    it("returns empty arrays for no realizations", () => {
        const result = computeTimeseriesStatistics([]);
        expect(result.mean).toEqual([]);
        expect(result.p10).toEqual([]);
    });

    it("computes per-timestep statistics across realizations", () => {
        // 3 realizations, 2 timesteps
        const realizations = [
            [10, 20],
            [20, 40],
            [30, 60],
        ];
        const result = computeTimeseriesStatistics(realizations);

        expect(result.mean[0]).toBe(20);
        expect(result.mean[1]).toBe(40);
        expect(result.min[0]).toBe(10);
        expect(result.max[0]).toBe(30);
        expect(result.min[1]).toBe(20);
        expect(result.max[1]).toBe(60);
    });

    it("handles single realization", () => {
        const result = computeTimeseriesStatistics([[5, 10, 15]]);
        expect(result.mean).toEqual([5, 10, 15]);
        expect(result.min).toEqual([5, 10, 15]);
        expect(result.max).toEqual([5, 10, 15]);
    });
});
