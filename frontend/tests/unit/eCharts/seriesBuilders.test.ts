import { describe, expect, it } from "vitest";

import { buildExceedanceChart } from "@modules/_shared/eCharts/builders/exceedanceChartBuilder";
import { buildBarSeries } from "@modules/_shared/eCharts/series/barSeries";
import { buildConvergenceSeries } from "@modules/_shared/eCharts/series/convergenceSeries";
import { buildDensitySeries } from "@modules/_shared/eCharts/series/densitySeries";
import { buildExceedanceSeries } from "@modules/_shared/eCharts/series/exceedanceSeries";
import { buildHeatmapSeries } from "@modules/_shared/eCharts/series/heatmapSeries";
import { buildHistogramSeries } from "@modules/_shared/eCharts/series/histogramSeries";
import { buildPercentileRangeSeries } from "@modules/_shared/eCharts/series/percentileRangeSeries";
import { buildRealizationScatterSeries } from "@modules/_shared/eCharts/series/realizationScatterSeries";
import { buildHistorySeries } from "@modules/_shared/eCharts/series/timeseriesHistorySeries";
import { buildObservationSeries } from "@modules/_shared/eCharts/series/timeseriesObservationSeries";
import { buildRealizationsSeries } from "@modules/_shared/eCharts/series/timeseriesRealizationSeries";
import { buildFanchartSeries, buildStatisticsSeries } from "@modules/_shared/eCharts/series/timeseriesStatisticsSeries";
import { getConvergenceSeriesStatKey } from "@modules/_shared/eCharts/utils";
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

    it("buildExceedanceSeries returns an unsmoothed line with structured ID and 100->0 endpoints", () => {
        const result = buildExceedanceSeries(
            {
                name: "ExceedTrace",
                color: "#115588",
                values: [40, 10, 30, 20],
            },
            2,
        );

        expect(result.series).toHaveLength(1);
        const series = result.series[0] as {
            id?: string;
            xAxisIndex?: number;
            yAxisIndex?: number;
            smooth?: boolean;
            data?: Array<[number, number]>;
        };

        expect(series.id).toBe("exceedance:ExceedTrace:curve:2");
        expect(series.xAxisIndex).toBe(2);
        expect(series.yAxisIndex).toBe(2);
        expect(series.smooth).toBe(false);

        const data = series.data ?? [];
        expect(data[0]).toEqual([10, 100]);
        expect(data[data.length - 1]).toEqual([40, 0]);
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

    it("buildHistorySeries returns a line series with structured ID and line-shape mapping", () => {
        const result = buildHistorySeries(
            {
                name: "History",
                color: "#000000",
                timestamps: [Date.UTC(2020, 0, 1), Date.UTC(2020, 1, 1)],
                values: [10, 14],
                lineShape: "vh",
            },
            1,
        );

        expect(result.series).toHaveLength(1);
        expect(result.legendData).toEqual(["History"]);

        const series = result.series[0] as {
            id?: string;
            step?: string;
            xAxisIndex?: number;
            yAxisIndex?: number;
        };

        expect(series.id).toBe("history:History:line:1");
        expect(series.step).toBe("start");
        expect(series.xAxisIndex).toBe(1);
        expect(series.yAxisIndex).toBe(1);
    });

    it("buildObservationSeries returns one structured custom series per observation", () => {
        const result = buildObservationSeries(
            {
                name: "Observation",
                color: "#111111",
                observations: [
                    {
                        date: Date.UTC(2020, 0, 1),
                        value: 100,
                        error: 3,
                        label: "Obs 1",
                        comment: "Synthetic",
                    },
                    {
                        date: Date.UTC(2020, 1, 1),
                        value: 104,
                        error: 4,
                        label: "Obs 2",
                    },
                ],
            },
            2,
        );

        expect(result.series).toHaveLength(2);
        expect(result.legendData).toEqual(["Observation"]);

        const ids = result.series.map((seriesOption) => (seriesOption as { id?: string }).id ?? "");
        expect(ids).toContain("observation:Observation:0:2");
        expect(ids).toContain("observation:Observation:1:2");

        for (const seriesOption of result.series) {
            const option = seriesOption as {
                type?: string;
                xAxisIndex?: number;
                yAxisIndex?: number;
                encode?: { x?: number; y?: number };
            };
            expect(option.type).toBe("custom");
            expect(option.xAxisIndex).toBe(2);
            expect(option.yAxisIndex).toBe(2);
            expect(option.encode).toEqual({ x: 0, y: 1 });
        }
    });

    it("timeseries series builders attach metadata for member, summary, and band semantics", () => {
        const trace = {
            name: "Trace A",
            color: "#225588",
            timestamps: [Date.UTC(2020, 0, 1), Date.UTC(2020, 1, 1)],
            highlightGroupKey: "Group A",
            realizationValues: [[10, 11]],
            realizationIds: [7],
            statistics: {
                mean: [10, 11],
                p10: [8, 9],
                p50: [10, 11],
                p90: [12, 13],
                min: [7, 8],
                max: [13, 14],
            },
        };

        const realizationSeries = buildRealizationsSeries(trace, 3).series[0] as {
            webvizSeriesMeta?: Record<string, unknown>;
        };
        const summarySeries = buildStatisticsSeries(trace, ["mean"], 3).series[0] as {
            webvizSeriesMeta?: Record<string, unknown>;
        };
        const bandSeries = buildFanchartSeries(trace, ["p10", "p90"], 3).series[0] as {
            webvizSeriesMeta?: Record<string, unknown>;
        };

        expect(realizationSeries.webvizSeriesMeta).toMatchObject({
            family: "timeseries",
            chart: "timeseries",
            axisIndex: 3,
            roles: ["member"],
            linkGroupKey: "Group A",
            memberKey: "7",
        });
        expect(summarySeries.webvizSeriesMeta).toMatchObject({
            family: "timeseries",
            chart: "timeseries",
            axisIndex: 3,
            roles: ["summary"],
            statKey: "mean",
        });
        expect(bandSeries.webvizSeriesMeta).toMatchObject({
            family: "timeseries",
            chart: "timeseries",
            axisIndex: 3,
            roles: ["band"],
        });
    });

    it("convergence and member scatter builders attach metadata for shared interaction helpers", () => {
        const convergenceResult = buildConvergenceSeries(
            {
                name: "Convergence",
                color: "#663399",
                values: [12, 10, 14],
                realizationIds: [1, 2, 3],
            },
            2,
        );
        const meanSeries = convergenceResult.series.find(
            (seriesOption) => (seriesOption as { id?: string }).id === "convergence:Convergence:mean:2",
        ) as { webvizSeriesMeta?: Record<string, unknown> } | undefined;
        const bandSeries = convergenceResult.series.find(
            (seriesOption) => (seriesOption as { id?: string }).id === "convergence:Convergence:band:2",
        ) as { webvizSeriesMeta?: Record<string, unknown> } | undefined;
        const scatterSeries = buildRealizationScatterSeries(
            {
                name: "Scatter",
                color: "#884422",
                highlightGroupKey: "Pair A",
                realizationIds: [12],
                xValues: [1],
                yValues: [2],
            },
            1,
        ).series[0] as { webvizSeriesMeta?: Record<string, unknown> };

        expect(meanSeries?.webvizSeriesMeta).toMatchObject({
            family: "distribution",
            chart: "convergence",
            axisIndex: 2,
            roles: ["summary"],
            statKey: "mean",
        });
        expect(bandSeries?.webvizSeriesMeta).toMatchObject({
            family: "distribution",
            chart: "convergence",
            axisIndex: 2,
            roles: ["band"],
        });
        expect(scatterSeries.webvizSeriesMeta).toMatchObject({
            family: "scatter",
            chart: "memberScatter",
            axisIndex: 1,
            roles: ["member"],
            linkGroupKey: "Pair A",
            memberKey: "12",
        });
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

    it("buildExceedanceChart constrains y-axis to 0..100", () => {
        const option = buildExceedanceChart([
            {
                title: "Subplot 1",
                traces: [{ name: "Exceed", color: "#224466", values: [1, 2, 3] }],
            },
        ]);

        const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis;
        expect((yAxis as { min?: number }).min).toBe(0);
        expect((yAxis as { max?: number }).max).toBe(100);

        const tooltip = option.tooltip as { trigger?: string };
        expect(tooltip.trigger).toBe("axis");
    });

    it("convergence stat parsing handles trace names with colons", () => {
        const id = makeConvergenceSeriesId("trace:with:colon", "p90", 0);
        expect(getConvergenceSeriesStatKey(id)).toBe("p90");
    });
});
