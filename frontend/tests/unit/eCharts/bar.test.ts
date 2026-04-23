import type { EChartsOption } from "echarts";
import { describe, expect, it } from "vitest";

import { buildBarChart } from "@modules/_shared/eCharts";

type CategoryAxis = {
    data?: unknown[];
    axisLabel?: { show?: boolean };
    name?: string;
};

type ChartSeries = {
    type?: string;
    name?: string;
    data?: unknown[];
};

function toCategoryAxis(axis: EChartsOption["xAxis"]): CategoryAxis {
    return (Array.isArray(axis) ? axis[0] : axis) as CategoryAxis;
}

function toBarSeries(option: EChartsOption): ChartSeries[] {
    return ((option.series ?? []) as ChartSeries[]).filter((series) => series.type === "bar");
}

describe("bar chart category alignment", () => {
    it("aligns traces to the union of categories and keeps missing values as gaps", () => {
        const option = buildBarChart([
            {
                title: "Subplot 1",
                traces: [
                    { name: "Trace A", color: "#336699", categories: ["A", "B"], values: [10, 20] },
                    { name: "Trace B", color: "#993333", categories: ["B", "C"], values: [30, 40] },
                ],
            },
        ]);

        expect(toCategoryAxis(option.xAxis).data).toEqual(["A", "B", "C"]);

        const series = toBarSeries(option);
        expect(series).toHaveLength(2);
        expect(series[0]).toMatchObject({ name: "Trace A", data: [10, 20, null] });
        expect(series[1]).toMatchObject({ name: "Trace B", data: [null, 30, 40] });
    });

    it("sorts shared categories by aggregate value when sortBy is values", () => {
        const option = buildBarChart(
            [
                {
                    title: "Subplot 1",
                    traces: [
                        { name: "Trace A", color: "#336699", categories: ["A", "B"], values: [10, 20] },
                        { name: "Trace B", color: "#993333", categories: ["B", "C"], values: [30, 40] },
                    ],
                },
            ],
            { sortBy: "values" },
        );

        expect(toCategoryAxis(option.xAxis).data).toEqual(["B", "C", "A"]);

        const series = toBarSeries(option);
        expect(series[0]).toMatchObject({ name: "Trace A", data: [20, null, 10] });
        expect(series[1]).toMatchObject({ name: "Trace B", data: [30, 40, null] });
    });

    it("adds p10, mean and p90 reference lines when statistical markers are enabled", () => {
        const option = buildBarChart(
            [
                {
                    title: "Subplot 1",
                    traces: [{ name: "Trace A", color: "#336699", categories: ["A", "B", "C"], values: [10, 20, 30] }],
                },
            ],
            { showStatisticalMarkers: true },
        );

        const series = (option.series ?? []) as ChartSeries[];
        const lineSeries = series.filter((entry) => entry.type === "line");

        expect(lineSeries).toHaveLength(3);
    });

    it("hides category labels when the subplot has many categories", () => {
        const option = buildBarChart(
            [
                {
                    title: "Subplot 1",
                    traces: [
                        {
                            name: "Trace A",
                            color: "#336699",
                            categories: Array.from({ length: 21 }, (_, index) => `Category ${index}`),
                            values: Array.from({ length: 21 }, (_, index) => index + 1),
                        },
                    ],
                },
            ],
        );

        expect(toCategoryAxis(option.xAxis).axisLabel?.show).toBe(false);
        expect(toCategoryAxis(option.xAxis).name).toBe("Category (hover to see values)");
    });
});