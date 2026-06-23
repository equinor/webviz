import type { EChartsOption } from "echarts";
import { describe, expect, it } from "vitest";

import type { TimeseriesDisplayConfig, TimeseriesSubplotOverlays, TimeseriesTrace } from "@modules/_shared/eCharts";
import {
    buildConvergenceChart,
    buildDensityChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    buildTimeseriesChart,
} from "@modules/_shared/eCharts";

type SeriesLike = {
    type?: string;
    clip?: boolean;
};

function getSeries(option: EChartsOption): SeriesLike[] {
    return (option.series ?? []) as SeriesLike[];
}

describe("series clipping under zoom", () => {
    it("clips timeseries fanchart and point-annotation custom series", () => {
        const displayConfig: TimeseriesDisplayConfig = {
            showMembers: false,
            showStatistics: true,
            showFanchart: true,
            showReferenceLines: false,
            showPointAnnotations: true,
            selectedStatistics: ["p10", "p90", "min", "max"],
        };

        const groups = [
            {
                title: "Subplot 1",
                traces: [
                    {
                        name: "Trace A",
                        color: "#336699",
                        timestamps: [1, 2, 3],
                        statistics: {
                            mean: [2, 3, 4],
                            p10: [1, 2, 3],
                            p50: [2, 3, 4],
                            p90: [3, 4, 5],
                            min: [0, 1, 2],
                            max: [4, 5, 6],
                        },
                    } satisfies TimeseriesTrace,
                ],
            },
        ];
        const overlays: TimeseriesSubplotOverlays[] = [{
            referenceLineTraces: [],
            pointAnnotationTraces: [{
                name: "Observations",
                color: "#cc5500",
                annotations: [{ date: 2, value: 3.5, error: 0.6, label: "Obs" }],
            }],
        }];

        const option = buildTimeseriesChart(groups, {
            subplotOverlays: overlays,
            displayConfig,
            zoomable: true,
        });

        const customSeries = getSeries(option).filter((series) => series.type === "custom");
        expect(customSeries.length).toBeGreaterThan(0);
        expect(customSeries.every((series) => series.clip === true)).toBe(true);
    });

    it("clips histogram custom bars and rug points", () => {
        const option = buildHistogramChart(
            [{
                title: "Subplot 1",
                traces: [{ name: "Trace A", color: "#336699", values: [1, 2, 2, 3], memberIds: [1, 2, 3, 4] }],
            }],
            { showMemberPoints: true, zoomable: true },
        );

        const series = getSeries(option);
        expect(series.find((entry) => entry.type === "custom")?.clip).toBe(true);
        expect(series.find((entry) => entry.type === "scatter")?.clip).toBe(true);
    });

    it("clips percentile summary glyph and member points", () => {
        const option = buildPercentileRangeChart(
            [{
                title: "Subplot 1",
                traces: [{ name: "Trace A", color: "#336699", values: [1, 2, 3, 4], memberIds: [1, 2, 3, 4] }],
            }],
            { showMemberPoints: true, zoomable: true },
        );

        const series = getSeries(option);
        expect(series.find((entry) => entry.type === "custom")?.clip).toBe(true);
        expect(series.find((entry) => entry.type === "scatter")?.clip).toBe(true);
    });

    it("clips density member points", () => {
        const option = buildDensityChart(
            [{
                title: "Subplot 1",
                traces: [{ name: "Trace A", color: "#336699", values: [1, 2, 3, 4], memberIds: [1, 2, 3, 4] }],
            }],
            { showMemberPoints: true, zoomable: true },
        );

        expect(getSeries(option).find((entry) => entry.type === "scatter")?.clip).toBe(true);
    });

    it("clips the convergence band", () => {
        const option = buildConvergenceChart(
            [{
                title: "Subplot 1",
                traces: [{ name: "Trace A", color: "#336699", values: [10, 20, 30, 40], memberIds: [1, 2, 3, 4] }],
            }],
            { zoomable: true },
        );

        expect(getSeries(option).find((entry) => entry.type === "custom")?.clip).toBe(true);
    });
});