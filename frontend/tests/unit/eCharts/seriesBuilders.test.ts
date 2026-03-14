import { describe, expect, it } from "vitest";

import { buildBarSeries } from "@modules/_shared/eCharts/series/barSeries";
import { getConvergenceSeriesStatKey } from "@modules/_shared/eCharts/series/convergenceSeries";
import { buildDensitySeries } from "@modules/_shared/eCharts/series/densitySeries";
import { buildHeatmapSeries } from "@modules/_shared/eCharts/series/heatmapSeries";
import { buildHistogramSeries } from "@modules/_shared/eCharts/series/histogramSeries";
import { buildPercentileRangeSeries } from "@modules/_shared/eCharts/series/percentileRangeSeries";
import { makeConvergenceSeriesId } from "@modules/_shared/eCharts/utils/seriesId";

describe("series builder contracts", () => {
    it("buildBarSeries returns axis-bound series with structured IDs", () => {
        const result = buildBarSeries(
            {
                name: "BarTrace",
                color: "#336699",
                categories: ["A", "B", "C"],
                values: [1, 3, 2],
            },
            2,
            { showStatisticalMarkers: true },
        );

        const ids = result.series.map((seriesOption) => (seriesOption as { id?: string }).id ?? "");
        expect(ids).toContain("bar:BarTrace:bars:2");
        expect(ids).toContain("bar:BarTrace:mean:2");

        for (const seriesOption of result.series) {
            expect((seriesOption as { xAxisIndex?: number }).xAxisIndex).toBe(2);
            expect((seriesOption as { yAxisIndex?: number }).yAxisIndex).toBe(2);
        }
    });

    it("buildDensitySeries returns KDE and realization-point IDs when enabled", () => {
        const result = buildDensitySeries(
            {
                name: "DensityTrace",
                color: "#cc3300",
                values: [1, 2, 3, 4],
                realizationIds: [10, 11, 12, 13],
            },
            { showRealizationPoints: true },
            1,
        );

        const ids = result.series.map((seriesOption) => (seriesOption as { id?: string }).id ?? "");
        expect(ids).toContain("density:DensityTrace:kde:1");
        expect(ids).toContain("density:DensityTrace:points:1");
    });

    it("buildPercentileRangeSeries returns glyph and point IDs when enabled", () => {
        const result = buildPercentileRangeSeries(
            {
                name: "PctTrace",
                color: "#009966",
                values: [100, 120, 130, 125],
                realizationIds: [1, 2, 3, 4],
            },
            { showRealizationPoints: true },
            3,
        );

        const ids = result.series.map((seriesOption) => (seriesOption as { id?: string }).id ?? "");
        expect(ids).toContain("percentile:PctTrace:glyph:3");
        expect(ids).toContain("percentile:PctTrace:points:3");
    });

    it("buildHeatmapSeries returns a heatmap series with structured ID", () => {
        const result = buildHeatmapSeries(
            {
                name: "HeatTrace",
                xLabels: ["T1", "T2"],
                yLabels: ["Y1"],
                timestampsUtcMs: [1, 2],
                data: [[0, 0, 1.23]],
                minValue: 1.23,
                maxValue: 1.23,
            },
            4,
            null,
        );

        expect(result.series).toHaveLength(1);
        expect((result.series[0] as { id?: string }).id).toBe("heatmap:HeatTrace:cells:4");
    });

    it("buildHistogramSeries returns bar and rug IDs when realization points are enabled", () => {
        const result = buildHistogramSeries(
            {
                name: "HistTrace",
                color: "#663399",
                values: [1, 2, 2, 3, 4],
                realizationIds: [1, 2, 3, 4, 5],
            },
            { showRealizationPoints: true, numBins: 4 },
            5,
        );

        const ids = result.series.map((seriesOption) => (seriesOption as { id?: string }).id ?? "");
        expect(ids).toContain("histogram:HistTrace:bars:5");
        expect(ids).toContain("histogram:HistTrace:rug:5");
    });

    it("returns empty legendData when no density series is produced", () => {
        const result = buildDensitySeries(
            {
                name: "TooShort",
                color: "#000000",
                values: [5],
            },
            {},
            0,
        );

        expect(result.series).toEqual([]);
        expect(result.legendData).toEqual([]);
    });

    it("convergence stat parsing handles trace names with colons", () => {
        const id = makeConvergenceSeriesId("trace:with:colon", "p90", 0);
        expect(getConvergenceSeriesStatKey(id)).toBe("p90");
    });
});
