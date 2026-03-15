import type { CallbackDataParams } from "echarts/types/dist/shared";
import { describe, expect, it } from "vitest";

import { formatBarTooltip } from "@modules/_shared/eCharts/interaction/tooltipBarFormatters";
import {
    formatConvergenceTooltip,
    formatExceedanceTooltip,
    formatRealizationScatterTooltip,
} from "@modules/_shared/eCharts/interaction/tooltipDistributionFormatters";
import {
    formatHistogramBarTooltip,
    formatHistogramRugTooltip,
} from "@modules/_shared/eCharts/interaction/tooltipHistogramFormatters";
import {
    buildCompactTooltipConfig,
    formatCompactTooltip,
    formatCompactTooltipHeader,
    formatCompactTooltipRow,
} from "@modules/_shared/eCharts/interaction/tooltipFormatters";
import {
    formatObservationTooltip,
    formatRealizationItemTooltip,
    formatStatisticsTooltip,
} from "@modules/_shared/eCharts/interaction/tooltipTimeseriesFormatters";

type MockParam = {
    componentType: "series";
    componentSubType: "line" | "bar";
    componentIndex: number;
    dataIndex: number;
    dataType: "main";
    name: string;
    marker: string;
    seriesId?: string;
    seriesName?: string;
    seriesType?: string;
    value?: unknown;
    data?: unknown;
    color?: string;
    axisValue?: string | number;
    axisValueLabel?: string | number;
    axisIndex?: number;
    xAxisIndex?: number;
};

function makeParam(input: Partial<MockParam>): CallbackDataParams {
    const param: MockParam = {
        componentType: "series",
        componentSubType: "line",
        componentIndex: 0,
        dataIndex: 0,
        dataType: "main",
        name: "2020-01-01",
        marker: "",
        seriesId: "statistic:Trace A:mean:0",
        seriesName: "Trace A",
        seriesType: "line",
        value: 0,
        axisValue: "2020-01-01",
        axisValueLabel: "2020-01-01",
        axisIndex: 0,
        xAxisIndex: 0,
        ...input,
    };

    return param as unknown as CallbackDataParams;
}

describe("compact tooltip primitives", () => {
    it("buildCompactTooltipConfig merges compact defaults", () => {
        const config = buildCompactTooltipConfig({ trigger: "item" as const });

        expect(config.trigger).toBe("item");
        expect(config.padding).toEqual([4, 6]);
        expect(config.textStyle).toEqual({ fontSize: 11, lineHeight: 14 });
    });

    it("formats compact tooltip header, row and wrapper", () => {
        const header = formatCompactTooltipHeader("Header");
        const row = formatCompactTooltipRow("Label", "Value", "#112233");
        const tooltip = formatCompactTooltip("Header", [{ label: "Label", value: "Value", color: "#112233" }]);

        expect(header).toContain("Header");
        expect(row).toContain("Label");
        expect(row).toContain("Value");
        expect(row).toContain("#112233");
        expect(tooltip).toContain("Header");
        expect(tooltip).toContain("Label");
        expect(tooltip).toContain("Value");
    });
});

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
                axisIndex: undefined,
                xAxisIndex: undefined,
            }),
            makeParam({
                seriesId: "statistic:Trace B:mean:1",
                seriesName: "Trace B",
                value: 20,
                axisValue: "2020-01-01",
                axisIndex: undefined,
                xAxisIndex: undefined,
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

describe("formatRealizationItemTooltip", () => {
    it("uses realization id when available", () => {
        const tooltip = formatRealizationItemTooltip(
            makeParam({
                seriesId: "realization:Group A:7:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-02-01",
                color: "#334455",
            }),
        );

        expect(tooltip).toContain("2020-02-01");
        expect(tooltip).toContain("Realization 7");
        expect(tooltip).toContain("12");
        expect(tooltip).toContain("#334455");
    });

    it("falls back to series name for non-realization id", () => {
        const tooltip = formatRealizationItemTooltip(
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 99,
            }),
        );

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("99");
    });
});

describe("formatObservationTooltip", () => {
    it("formats observation label, value and absolute uncertainty", () => {
        const tooltip = formatObservationTooltip(
            makeParam({
                color: "#111111",
                data: {
                    value: ["2020-01-15", 100, -5],
                    label: "Obs 1",
                    comment: "Synthetic",
                },
            }),
        );

        expect(tooltip).toContain("2020-01-15");
        expect(tooltip).toContain("Obs 1: Synthetic");
        expect(tooltip).toContain("100");
        expect(tooltip).toContain("5");
    });

    it("returns empty string when datum shape is invalid", () => {
        const tooltip = formatObservationTooltip(makeParam({ data: { value: [1, 2] } }));
        expect(tooltip).toBe("");
    });
});

describe("formatBarTooltip", () => {
    it("keeps only bar entries and uses axis value label as header", () => {
        const tooltip = formatBarTooltip([
            makeParam({
                componentSubType: "bar",
                seriesType: "bar",
                seriesName: "Bars A",
                value: 10,
                axisValueLabel: "Category A",
            }),
            makeParam({
                componentSubType: "line",
                seriesType: "line",
                seriesName: "Line B",
                value: 999,
                axisValueLabel: "Category A",
            }),
        ]);

        expect(tooltip).toContain("Category A");
        expect(tooltip).toContain("Bars A");
        expect(tooltip).toContain("10");
        expect(tooltip).not.toContain("Line B");
        expect(tooltip).not.toContain("999");
    });

    it("returns empty string when there are no bar entries", () => {
        const tooltip = formatBarTooltip(makeParam({ seriesType: "line" }));
        expect(tooltip).toBe("");
    });
});

describe("formatConvergenceTooltip", () => {
    it("formats only convergence statistic entries", () => {
        const tooltip = formatConvergenceTooltip([
            makeParam({
                seriesId: "convergence:Trace A:p90:0",
                seriesName: "Trace A",
                value: 14,
                axisValueLabel: "12",
                color: "#223344",
            }),
            makeParam({
                seriesId: "convergence:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValueLabel: "12",
                color: "#223344",
            }),
            makeParam({
                seriesId: "convergence:Trace A:band:0",
                seriesName: "Trace A",
                value: 123,
                axisValueLabel: "12",
            }),
        ]);

        expect(tooltip).toContain("Realization: 12");
        expect(tooltip).toContain("Trace A (P90)");
        expect(tooltip).toContain("Trace A (Mean)");
        expect(tooltip).toContain("14");
        expect(tooltip).toContain("10");
        expect(tooltip).not.toContain("123");
    });
});

describe("formatExceedanceTooltip", () => {
    it("formats exceedance percentages from line point values", () => {
        const tooltip = formatExceedanceTooltip([
            makeParam({
                seriesType: "line",
                seriesName: "Trace A",
                value: [10, 25],
                axisValueLabel: 10,
                color: "#556677",
            }),
            makeParam({
                seriesType: "line",
                seriesName: "Trace B",
                value: [10, 40],
                axisValueLabel: 10,
                color: "#778899",
            }),
        ]);

        expect(tooltip).toContain("Value: 10");
        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Trace B");
        expect(tooltip).toContain("25%");
        expect(tooltip).toContain("40%");
    });

    it("returns empty string when no line entries are present", () => {
        const tooltip = formatExceedanceTooltip(makeParam({ seriesType: "bar", componentSubType: "bar" }));
        expect(tooltip).toBe("");
    });
});

describe("histogram tooltip formatters", () => {
    it("formats histogram bar range and percentage", () => {
        const tooltip = formatHistogramBarTooltip(makeParam({ value: [1, 3, 0, 12.5] }), "Hist", "#112233");

        expect(tooltip).toContain("Hist");
        expect(tooltip).toContain("Range");
        expect(tooltip).toContain("1 - 3");
        expect(tooltip).toContain("Percentage");
        expect(tooltip).toContain("12.50%");
    });

    it("returns trace name when histogram bar value shape is invalid", () => {
        const tooltip = formatHistogramBarTooltip(makeParam({ value: [1, 2, 3] }), "Hist", "#112233");
        expect(tooltip).toBe("Hist");
    });

    it("formats rug tooltip with explicit realization id", () => {
        const tooltip = formatHistogramRugTooltip(
            makeParam({
                value: [7, 0],
                data: { value: [7, 0], realizationId: 42 },
            }),
            "Hist",
            "#112233",
        );

        expect(tooltip).toContain("Hist");
        expect(tooltip).toContain("Value");
        expect(tooltip).toContain("7");
        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("42");
    });

    it("falls back to dataIndex when rug datum has no realization id", () => {
        const tooltip = formatHistogramRugTooltip(
            makeParam({ value: [9, 0], data: 9, dataIndex: 5 }),
            "Hist",
            "#112233",
        );

        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("5");
    });
});

describe("formatRealizationScatterTooltip", () => {
    it("shows x/y and realization id for realization series", () => {
        const tooltip = formatRealizationScatterTooltip(
            makeParam({
                seriesId: "realization:Group A:9:0",
                seriesName: "Scatter A",
                value: [4, 5],
                color: "#abcdef",
            }),
        );

        expect(tooltip).toContain("Scatter A");
        expect(tooltip).toContain("X");
        expect(tooltip).toContain("4");
        expect(tooltip).toContain("Y");
        expect(tooltip).toContain("5");
        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("9");
    });

    it("omits realization row for non-realization series id", () => {
        const tooltip = formatRealizationScatterTooltip(
            makeParam({
                seriesId: "density:Trace A:points:0",
                seriesName: "Scatter A",
                value: [4, 5],
            }),
        );

        expect(tooltip).toContain("Scatter A");
        expect(tooltip).not.toContain("Realization");
    });
});
