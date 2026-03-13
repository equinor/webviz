import { describe, expect, it } from "vitest";

import { computeKde } from "@modules/_shared/eCharts/utils/kde";

describe("computeKde", () => {
    it("returns empty array for empty input", () => {
        expect(computeKde([], 100)).toEqual([]);
    });

    it("returns the requested number of points", () => {
        const sorted = [1, 2, 3, 4, 5];
        const result = computeKde(sorted, 50);
        expect(result).toHaveLength(50);
    });

    it("produces [x, density] pairs", () => {
        const result = computeKde([1, 2, 3], 10);
        for (const [x, y] of result) {
            expect(typeof x).toBe("number");
            expect(typeof y).toBe("number");
            expect(y).toBeGreaterThanOrEqual(0);
        }
    });

    it("density peaks near the data cluster", () => {
        // Cluster around 50 with a few outliers
        const sorted = [10, 48, 49, 50, 50, 51, 52, 90];
        const result = computeKde(sorted, 200);

        // Find peak
        let maxY = 0;
        let peakX = 0;
        for (const [x, y] of result) {
            if (y > maxY) {
                maxY = y;
                peakX = x;
            }
        }
        expect(peakX).toBeGreaterThan(40);
        expect(peakX).toBeLessThan(60);
    });

    it("handles identical values (zero variance)", () => {
        const sorted = [5, 5, 5, 5, 5];
        const result = computeKde(sorted, 20);
        expect(result).toHaveLength(20);
        // Should still produce a valid density (no NaN/Infinity)
        for (const [, y] of result) {
            expect(Number.isFinite(y)).toBe(true);
        }
    });

    it("density integrates to approximately 1", () => {
        const sorted = Array.from({ length: 100 }, (_, i) => i);
        const result = computeKde(sorted, 500);

        // Trapezoidal integration
        let integral = 0;
        for (let i = 1; i < result.length; i++) {
            const dx = result[i][0] - result[i - 1][0];
            integral += 0.5 * (result[i][1] + result[i - 1][1]) * dx;
        }
        expect(integral).toBeCloseTo(1, 1);
    });
});
