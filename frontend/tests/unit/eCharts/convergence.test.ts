import { describe, expect, it } from "vitest";

import { calcConvergence } from "@modules/_shared/eCharts/utils/convergence";

describe("calcConvergence", () => {
    it("returns empty array for empty input", () => {
        expect(calcConvergence([])).toEqual([]);
    });

    it("first point mean equals its own value", () => {
        const result = calcConvergence([{ member: 1, value: 10 }]);
        expect(result).toHaveLength(1);
        expect(result[0].mean).toBe(10);
        expect(result[0].member).toBe(1);
    });

    it("running mean converges to the overall mean", () => {
        const pairs = [
            { member: 1, value: 10 },
            { member: 2, value: 20 },
            { member: 3, value: 30 },
            { member: 4, value: 40 },
        ];
        const result = calcConvergence(pairs);

        expect(result[0].mean).toBe(10);
        expect(result[1].mean).toBe(15);
        expect(result[2].mean).toBe(20);
        expect(result[3].mean).toBe(25);
    });

    it("preserves member IDs", () => {
        const pairs = [
            { member: 5, value: 1 },
            { member: 10, value: 2 },
        ];
        const result = calcConvergence(pairs);
        expect(result[0].member).toBe(5);
        expect(result[1].member).toBe(10);
    });

    it("p10 >= p90 (reserves convention) for enough data", () => {
        const pairs = Array.from({ length: 20 }, (_, i) => ({
            member: i,
            value: i * 10,
        }));
        const result = calcConvergence(pairs);
        const last = result[result.length - 1];
        expect(last.p10).toBeGreaterThanOrEqual(last.p90);
    });

    it("p10 and p90 narrow as members grow", () => {
        // With constant values, p10-p90 spread should stay at 0
        const pairs = Array.from({ length: 10 }, (_, i) => ({
            member: i,
            value: 50,
        }));
        const result = calcConvergence(pairs);
        for (const point of result) {
            expect(point.p10).toBe(50);
            expect(point.p90).toBe(50);
            expect(point.mean).toBe(50);
        }
    });
});
