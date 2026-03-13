import { describe, expect, it } from "vitest";

import {
    computeHistogramLayout,
    computeHistogramTraceData,
} from "@modules/_shared/eCharts/utils/histogram";
import { HistogramType } from "@modules/_shared/eCharts/types";

const makeTrace = (name: string, values: number[]) => ({ name, color: "#000", values });

describe("computeHistogramTraceData", () => {
    it("returns empty array for no traces", () => {
        expect(computeHistogramTraceData([], 10)).toEqual([]);
    });

    it("bins values into the requested number of bins", () => {
        const traces = [makeTrace("A", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])];
        const result = computeHistogramTraceData(traces, 5);

        expect(result).toHaveLength(1);
        expect(result[0].bins).toHaveLength(5);
    });

    it("bin percentages sum to 100%", () => {
        const traces = [makeTrace("A", [1, 2, 3, 4, 5])];
        const result = computeHistogramTraceData(traces, 3);
        const totalPct = result[0].bins.reduce((sum, bin) => sum + bin.percentage, 0);
        expect(totalPct).toBeCloseTo(100, 5);
    });

    it("total count equals number of values", () => {
        const values = [1, 1, 2, 3, 5, 8, 13];
        const result = computeHistogramTraceData([makeTrace("A", values)], 4);
        const totalCount = result[0].bins.reduce((sum, bin) => sum + bin.count, 0);
        expect(totalCount).toBe(values.length);
    });

    it("computes per-trace statistics", () => {
        const result = computeHistogramTraceData([makeTrace("A", [10, 20, 30])], 5);
        expect(result[0].stats.mean).toBe(20);
        expect(result[0].stats.min).toBe(10);
        expect(result[0].stats.max).toBe(30);
    });
});

describe("computeHistogramLayout", () => {
    const traces = [
        makeTrace("A", [1, 2, 3, 4, 5]),
        makeTrace("B", [2, 3, 4, 5, 6]),
    ];
    const traceData = computeHistogramTraceData(traces, 5);

    it("overlay: bars start at y=0", () => {
        const layout = computeHistogramLayout(traceData, HistogramType.Overlay);
        for (const bars of layout.barsByTrace) {
            for (const bar of bars) {
                expect(bar.yStart).toBe(0);
            }
        }
    });

    it("stack: bars stack on top of each other", () => {
        const layout = computeHistogramLayout(traceData, HistogramType.Stack);
        // Second trace bars should start where first trace bars end
        for (let i = 0; i < layout.barsByTrace[0].length; i++) {
            const firstEnd = layout.barsByTrace[0][i].yEnd;
            const secondStart = layout.barsByTrace[1][i].yStart;
            expect(secondStart).toBeCloseTo(firstEnd, 10);
        }
    });

    it("group: bars are side by side within each bin", () => {
        const layout = computeHistogramLayout(traceData, HistogramType.Group);
        for (let i = 0; i < layout.barsByTrace[0].length; i++) {
            const a = layout.barsByTrace[0][i];
            const b = layout.barsByTrace[1][i];
            // A ends where B starts (adjacent)
            expect(a.xEnd).toBeCloseTo(b.xStart, 10);
        }
    });

    it("yMax is positive when there is data", () => {
        const layout = computeHistogramLayout(traceData, HistogramType.Overlay);
        expect(layout.yMax).toBeGreaterThan(0);
    });
});
