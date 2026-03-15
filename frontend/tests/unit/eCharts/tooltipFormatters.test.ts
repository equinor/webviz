import type { CallbackDataParams } from "echarts/types/dist/shared";
import { describe, expect, it } from "vitest";

import { formatStatisticsTooltip } from "@modules/_shared/eCharts/interaction/tooltipFormatters";

type MockParam = {
    componentType: "series";
    componentSubType: "line";
    componentIndex: number;
    dataIndex: number;
    dataType: "main";
    name: string;
    marker: string;
    seriesId: string;
    seriesName: string;
    value: number;
    color?: string;
    axisValue?: string;
    axisIndex?: number;
    xAxisIndex?: number;
};

function makeParam(input: {
    seriesId: string;
    seriesName: string;
    value: number;
    axisValue: string;
    axisIndex?: number;
}): CallbackDataParams {
    const param: MockParam = {
        componentType: "series",
        componentSubType: "line",
        componentIndex: 0,
        dataIndex: 0,
        dataType: "main",
        name: input.axisValue,
        marker: "",
        seriesId: input.seriesId,
        seriesName: input.seriesName,
        value: input.value,
        axisValue: input.axisValue,
        axisIndex: input.axisIndex,
        xAxisIndex: input.axisIndex,
    };

    return param as unknown as CallbackDataParams;
}

describe("formatStatisticsTooltip", () => {
    it("shows only statistics from the hovered subplot axis", () => {
        const tooltip = formatStatisticsTooltip([
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "statistic:Trace B:mean:1",
                seriesName: "Trace B",
                value: 20,
                axisValue: "2020-01-01",
                axisIndex: 1,
            }),
        ]);

        expect(tooltip).toContain("2020-01-01");
        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10");
        expect(tooltip).not.toContain("Trace B");
        expect(tooltip).not.toContain("Mean 20");
    });

    it("falls back to axis index parsed from series ID when runtime axis is missing", () => {
        const tooltip = formatStatisticsTooltip([
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
            }),
            makeParam({
                seriesId: "statistic:Trace B:mean:1",
                seriesName: "Trace B",
                value: 20,
                axisValue: "2020-01-01",
            }),
        ]);

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10");
        expect(tooltip).not.toContain("Trace B");
    });

    it("compacts multiple statistics into one row per trace", () => {
        const tooltip = formatStatisticsTooltip([
            makeParam({
                seriesId: "statistic:Trace A:p10:0",
                seriesName: "Trace A",
                value: 8,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "statistic:Trace A:p90:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
        ]);

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10 | P10 8 | P90 12");
    });

    it("still excludes non-statistical series categories", () => {
        const tooltip = formatStatisticsTooltip([
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "fanchart:Trace A:band:0",
                seriesName: "Trace A",
                value: 999,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "realization:Trace A:4:0",
                seriesName: "Trace A",
                value: 888,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "history:History:line:0",
                seriesName: "History",
                value: 777,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
            makeParam({
                seriesId: "observation:Observation:0:0",
                seriesName: "Observation",
                value: 666,
                axisValue: "2020-01-01",
                axisIndex: 0,
            }),
        ]);

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10");
        expect(tooltip).not.toContain("999");
        expect(tooltip).not.toContain("888");
        expect(tooltip).not.toContain("777");
        expect(tooltip).not.toContain("666");
    });
});
