import type { EChartsOption } from "echarts";
import { describe, expect, it } from "vitest";

import { buildExceedanceChart } from "@modules/_shared/eCharts/builders/exceedanceChartBuilder";
import { buildHistogramChart } from "@modules/_shared/eCharts/builders/histogramChartBuilder";
import { buildPercentileRangeChart } from "@modules/_shared/eCharts/builders/percentileRangeChartBuilder";

type NumericAxis = {
    min?: number;
    max?: number;
};

function toAxisArray(axis: EChartsOption["xAxis"] | EChartsOption["yAxis"]): NumericAxis[] {
    if (Array.isArray(axis)) {
        return axis as NumericAxis[];
    }
    return axis ? [axis as NumericAxis] : [];
}

describe("shared cartesian axes", () => {
    it("shares explicit numeric x extents across exceedance subplots", () => {
        const option = buildExceedanceChart(
            [
                {
                    title: "Low range",
                    traces: [{ name: "Trace A", color: "#336699", values: [1, 2, 3] }],
                },
                {
                    title: "High range",
                    traces: [{ name: "Trace B", color: "#993333", values: [10, 20, 30] }],
                },
            ],
            { sharedXAxis: true },
        );

        const xAxes = toAxisArray(option.xAxis);
        expect(xAxes).toHaveLength(2);
        expect(xAxes[0]).toMatchObject({ min: 1, max: 30 });
        expect(xAxes[1]).toMatchObject({ min: 1, max: 30 });
    });

    it("shares x extents for custom percentile glyph series", () => {
        const option = buildPercentileRangeChart(
            [
                {
                    title: "Subplot 1",
                    traces: [{ name: "Trace A", color: "#336699", values: [1, 2, 3, 4] }],
                },
                {
                    title: "Subplot 2",
                    traces: [{ name: "Trace B", color: "#993333", values: [50, 60, 70, 80] }],
                },
            ],
            { sharedXAxis: true },
        );

        const xAxes = toAxisArray(option.xAxis);
        expect(xAxes).toHaveLength(2);
        expect(xAxes[0]).toMatchObject({ min: 1, max: 80 });
        expect(xAxes[1]).toMatchObject({ min: 1, max: 80 });
    });

    it("shares post-processed histogram y extents across subplots", () => {
        const option = buildHistogramChart(
            [
                {
                    title: "Tall bin",
                    traces: [{ name: "Trace A", color: "#336699", values: [1, 1, 1, 1, 1] }],
                },
                {
                    title: "Spread values",
                    traces: [{ name: "Trace B", color: "#993333", values: [1, 2, 3, 4, 5] }],
                },
            ],
            { sharedYAxis: true },
        );

        const yAxes = toAxisArray(option.yAxis);
        expect(yAxes).toHaveLength(2);
        expect(yAxes[0].min).toBe(0);
        expect(yAxes[1].min).toBe(0);
        expect(yAxes[0].max).toBeCloseTo(110);
        expect(yAxes[1].max).toBeCloseTo(110);
    });
});
