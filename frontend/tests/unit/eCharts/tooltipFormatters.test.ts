import type { CallbackDataParams } from "echarts/types/dist/shared";
import { describe, expect, it } from "vitest";

import { formatBarAxisTooltip, formatBarMeanTooltip } from "@modules/_shared/eCharts/charts//bar";
import { buildConvergenceTooltip, formatConvergenceAxisTooltip } from "@modules/_shared/eCharts/charts//convergence";
import {
    formatExceedanceAxisTooltip,
} from "@modules/_shared/eCharts/charts//exceedance";
import { formatHeatmapItemTooltip } from "@modules/_shared/eCharts/charts//heatmap";
import {
    createHistogramBarTooltipFormatter,
    createHistogramRugTooltipFormatter,
} from "@modules/_shared/eCharts/charts//histogram";
import { formatMemberScatterItemTooltip } from "@modules/_shared/eCharts/charts//memberScatter";
import {
    createPercentileGlyphTooltipFormatter,
    createPercentileRealizationTooltipFormatter,
} from "@modules/_shared/eCharts/charts//percentileRange";
import {
    buildTimeseriesTooltip,
    formatObservationTooltip,
    formatMemberItemTooltip,
    formatStatisticsAxisTooltip,
} from "@modules/_shared/eCharts/charts//timeseries";
import {
    buildCompactTooltipConfig,
    formatCompactTooltip,
    formatCompactTooltipHeader,
    formatCompactTooltipRow,
} from "@modules/_shared/eCharts/core/tooltip";
import type { SeriesMetadata } from "@modules/_shared/eCharts/utils/seriesMetadata";

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
    webvizSeriesMeta?: SeriesMetadata;
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

function makeTimeseriesSummaryMetadata(axisIndex: number, statKey: string): SeriesMetadata {
    return {
        chart: "timeseries",
        axisIndex,
        roles: ["summary"],
        statKey,
    };
}

function makeConvergenceSummaryMetadata(axisIndex: number, statKey: "p90" | "mean" | "p10"): SeriesMetadata {
    return {

        chart: "convergence",
        axisIndex,
        roles: ["summary"],
        statKey,
    };
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
        const tooltip = formatStatisticsAxisTooltip([
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(0, "mean"),
            }),
            makeParam({
                seriesId: "statistic:Trace B:mean:1",
                seriesName: "Trace B",
                value: 20,
                axisValue: "2020-01-01",
                axisIndex: 1,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(1, "mean"),
            }),
        ]);

        expect(tooltip).toContain("2020-01-01");
        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10");
        expect(tooltip).not.toContain("Trace B");
        expect(tooltip).not.toContain("Mean 20");
    });

    it("uses the explicit statistic lookup when runtime axis and param metadata are missing", () => {
        const tooltipConfig = buildTimeseriesTooltip(
            {
                showRealizations: true,
                showStatistics: true,
                showFanchart: false,
                showHistorical: false,
                showObservations: false,
                selectedStatistics: ["mean"],
            },
            {},
            {
                statisticSeriesById: new Map([
                    ["statistic:Trace A:mean:0", { traceName: "Trace A", statKey: "mean", axisIndex: 0 }],
                    ["statistic:Trace B:mean:1", { traceName: "Trace B", statKey: "mean", axisIndex: 1 }],
                ]),
            },
        );

        const tooltip = tooltipConfig.formatter?.([
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

    it("prefers explicit metadata over unrelated lookup entries", () => {
        const tooltipConfig = buildTimeseriesTooltip(
            {
                showRealizations: true,
                showStatistics: true,
                showFanchart: false,
                showHistorical: false,
                showObservations: false,
                selectedStatistics: ["mean"],
            },
            {},
            {
                statisticSeriesById: new Map([
                    ["bar:Trace A:bars:99", { traceName: "Trace A", statKey: "mean", axisIndex: 1 }],
                    ["bar:Trace B:bars:99", { traceName: "Trace B", statKey: "mean", axisIndex: 0 }],
                ]),
            },
        );

        const tooltip = tooltipConfig.formatter?.([
            makeParam({
                seriesId: "bar:Trace A:bars:99",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: undefined,
                xAxisIndex: undefined,
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["summary"],
                    statKey: "mean",
                },
            }),
            makeParam({
                seriesId: "bar:Trace B:bars:99",
                seriesName: "Trace B",
                value: 20,
                axisValue: "2020-01-01",
                axisIndex: undefined,
                xAxisIndex: undefined,
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 1,
                    roles: ["summary"],
                    statKey: "mean",
                },
            }),
        ]);

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10");
        expect(tooltip).not.toContain("Trace B");
    });

    it("compacts multiple statistics into one row per trace", () => {
        const tooltip = formatStatisticsAxisTooltip([
            makeParam({
                seriesId: "statistic:Trace A:p10:0",
                seriesName: "Trace A",
                value: 8,
                axisValue: "2020-01-01",
                axisIndex: 0,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(0, "p10"),
            }),
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(0, "mean"),
            }),
            makeParam({
                seriesId: "statistic:Trace A:p90:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-01-01",
                axisIndex: 0,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(0, "p90"),
            }),
        ]);

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean 10 | P10 8 | P90 12");
    });

    it("still excludes non-statistical series categories", () => {
        const tooltip = formatStatisticsAxisTooltip([
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValue: "2020-01-01",
                axisIndex: 0,
                webvizSeriesMeta: makeTimeseriesSummaryMetadata(0, "mean"),
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

describe("formatMemberItemTooltip", () => {
    it("uses realization id when available", () => {
        const tooltip = formatMemberItemTooltip(
            makeParam({
                seriesId: "realization:Group A:7:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-02-01",
                color: "#334455",
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "7",
                },
            }),
        );

        expect(tooltip).toContain("2020-02-01");
        expect(tooltip).toContain("Realization 7");
        expect(tooltip).toContain("12");
        expect(tooltip).toContain("#334455");
    });

    it("falls back to series name for non-realization id", () => {
        const tooltip = formatMemberItemTooltip(
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 99,
            }),
        );

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("99");
    });

    it("uses metadata member keys when present", () => {
        const tooltip = formatMemberItemTooltip(
            makeParam({
                seriesId: "statistic:Trace A:mean:0",
                seriesName: "Trace A",
                value: 15,
                axisValue: "2020-02-01",
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "42",
                },
            }),
        );

        expect(tooltip).toContain("2020-02-01");
        expect(tooltip).toContain("Realization 42");
        expect(tooltip).toContain("15");
    });

    it("supports overriding the member label", () => {
        const tooltip = formatMemberItemTooltip(
            makeParam({
                seriesId: "realization:Group A:7:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-02-01",
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "7",
                },
            }),
            { memberLabel: "Member" },
        );

        expect(tooltip).toContain("Member 7");
        expect(tooltip).not.toContain("Realization 7");
    });
});

describe("buildTimeseriesTooltip", () => {
    it("passes member label overrides to item tooltip formatting", () => {
        const tooltipConfig = buildTimeseriesTooltip(
            {
                showRealizations: true,
                showStatistics: false,
                showFanchart: false,
                showHistorical: false,
                showObservations: false,
                selectedStatistics: [],
            },
            { memberLabel: "Member" },
        );

        expect(tooltipConfig.formatter).toBeTypeOf("function");

        const tooltip = tooltipConfig.formatter?.(
            makeParam({
                seriesId: "realization:Group A:7:0",
                seriesName: "Trace A",
                value: 12,
                axisValue: "2020-02-01",
                webvizSeriesMeta: {

                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "7",
                },
            }),
        );

        expect(tooltip).toContain("Member 7");
        expect(tooltip).not.toContain("Realization 7");
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
        const tooltip = formatBarAxisTooltip([
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
        const tooltip = formatBarAxisTooltip(makeParam({ seriesType: "line" }));
        expect(tooltip).toBe("");
    });
});

describe("formatBarMeanTooltip", () => {
    it("formats a compact mean row", () => {
        const tooltip = formatBarMeanTooltip("Trace A", 12, "#112233");

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Mean");
        expect(tooltip).toContain("12");
    });
});

describe("formatConvergenceTooltip", () => {
    it("formats only convergence statistic entries through the explicit lookup", () => {
        const tooltipConfig = buildConvergenceTooltip({
            statKeyBySeriesId: new Map([
                ["convergence:Trace A:p90:0", "p90"],
                ["convergence:Trace A:mean:0", "mean"],
            ]),
        });

        const tooltip = tooltipConfig.formatter?.([
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

    it("formats convergence metadata directly when it is available on params", () => {
        const tooltip = formatConvergenceAxisTooltip([
            makeParam({
                seriesId: "convergence:Trace A:p90:0",
                seriesName: "Trace A",
                value: 14,
                axisValueLabel: "12",
                color: "#223344",
                webvizSeriesMeta: makeConvergenceSummaryMetadata(0, "p90"),
            }),
            makeParam({
                seriesId: "convergence:Trace A:mean:0",
                seriesName: "Trace A",
                value: 10,
                axisValueLabel: "12",
                color: "#223344",
                webvizSeriesMeta: makeConvergenceSummaryMetadata(0, "mean"),
            }),
        ]);

        expect(tooltip).toContain("Trace A (P90)");
        expect(tooltip).toContain("Trace A (Mean)");
    });
});

describe("formatExceedanceTooltip", () => {
    it("formats exceedance header and volume values from line point values", () => {
        const tooltip = formatExceedanceAxisTooltip([
            makeParam({
                seriesType: "line",
                seriesName: "Trace A",
                value: [10, 25],
                axisValue: 25,
                axisValueLabel: 25,
                color: "#556677",
            }),
            makeParam({
                seriesType: "line",
                seriesName: "Trace B",
                value: [12, 25],
                axisValue: 25,
                axisValueLabel: 25,
                color: "#778899",
            }),
        ]);

        expect(tooltip).toContain("P25 Exceedance");
        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Trace B");
        expect(tooltip).toContain("10");
        expect(tooltip).toContain("12");
        expect(tooltip).not.toContain("%");
    });

    it("falls back to point probability when axis value is not numeric", () => {
        const tooltip = formatExceedanceAxisTooltip(
            makeParam({
                seriesType: "line",
                seriesName: "Trace A",
                value: [11, 30],
            }),
        );

        expect(tooltip).toContain("P30 Exceedance");
        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("11");
    });

    it("returns empty string when no line entries are present", () => {
        const tooltip = formatExceedanceAxisTooltip(makeParam({ seriesType: "bar", componentSubType: "bar" }));
        expect(tooltip).toBe("");
    });
});

describe("histogram tooltip formatters", () => {
    it("formats histogram bar range and percentage", () => {
        const tooltip = createHistogramBarTooltipFormatter("Hist", "#112233")(makeParam({ value: [1, 3, 0, 12.5] }));

        expect(tooltip).toContain("Hist");
        expect(tooltip).toContain("Range");
        expect(tooltip).toContain("1 - 3");
        expect(tooltip).toContain("Percentage");
        expect(tooltip).toContain("12.50%");
    });

    it("returns trace name when histogram bar value shape is invalid", () => {
        const tooltip = createHistogramBarTooltipFormatter("Hist", "#112233")(makeParam({ value: [1, 2, 3] }));
        expect(tooltip).toBe("Hist");
    });

    it("formats rug tooltip with explicit realization id", () => {
        const tooltip = createHistogramRugTooltipFormatter("Hist", "#112233")(
            makeParam({
                value: [7, 0],
                data: { value: [7, 0], realizationId: 42 },
            }),
        );

        expect(tooltip).toContain("Hist");
        expect(tooltip).toContain("Value");
        expect(tooltip).toContain("7");
        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("42");
    });

    it("falls back to dataIndex when rug datum has no realization id", () => {
        const tooltip = createHistogramRugTooltipFormatter("Hist", "#112233")(
            makeParam({ value: [9, 0], data: 9, dataIndex: 5 }),
        );

        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("5");
    });
});

describe("formatHeatmapTooltip", () => {
    it("formats heatmap x/y labels and value", () => {
        const tooltip = formatHeatmapItemTooltip(
            {
                seriesIndex: 0,
                value: [0, 0, 42],
                data: [0, 0, 42],
            } as unknown as CallbackDataParams,
            [{ title: "Map A", trace: { xLabels: ["Jan"], yLabels: ["Layer 1"] } }],
            "Value",
        );

        expect(tooltip).toContain("Map A");
        expect(tooltip).toContain("X");
        expect(tooltip).toContain("Jan");
        expect(tooltip).toContain("Y");
        expect(tooltip).toContain("Layer 1");
        expect(tooltip).toContain("Value");
        expect(tooltip).toContain("42");
    });

    it("returns empty string for invalid data shape", () => {
        const tooltip = formatHeatmapItemTooltip(
            {
                seriesIndex: 0,
                value: [0, 0],
            } as unknown as CallbackDataParams,
            [{ title: "Map A", trace: { xLabels: ["Jan"], yLabels: ["Layer 1"] } }],
            "Value",
        );

        expect(tooltip).toBe("");
    });
});

describe("percentile tooltip formatters", () => {
    it("formats percentile glyph tooltip rows", () => {
        const tooltip = createPercentileGlyphTooltipFormatter(
            "Trace A",
            "#112233",
            {
                min: 1,
                p10: 2,
                p50: 3,
                p90: 4,
                max: 5,
                mean: 3.5,
                count: 5,
                stdDev: 1,
            },
            3,
            "p50",
        )();

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Min");
        expect(tooltip).toContain("P90");
        expect(tooltip).toContain("P50");
        expect(tooltip).toContain("Mean");
    });

    it("formats percentile realization tooltip rows", () => {
        const tooltip = createPercentileRealizationTooltipFormatter("Trace A", "#112233")(
            makeParam({ value: [7, 0], data: { value: [7, 0], realizationId: 8 } }),
        );

        expect(tooltip).toContain("Trace A");
        expect(tooltip).toContain("Value");
        expect(tooltip).toContain("7");
        expect(tooltip).toContain("Realization");
        expect(tooltip).toContain("8");
    });
});

describe("formatMemberScatterTooltip", () => {
    it("shows x/y and member id for member series", () => {
        const tooltip = formatMemberScatterItemTooltip(
            makeParam({
                seriesId: "realization:Group A:9:0",
                seriesName: "Scatter A",
                value: [4, 5],
                color: "#abcdef",
                webvizSeriesMeta: {

                    chart: "memberScatter",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "9",
                },
            }),
        );

        expect(tooltip).toContain("Scatter A");
        expect(tooltip).toContain("X");
        expect(tooltip).toContain("4");
        expect(tooltip).toContain("Y");
        expect(tooltip).toContain("5");
        expect(tooltip).toContain("Member");
        expect(tooltip).toContain("9");
    });

    it("supports overriding the member label", () => {
        const tooltip = formatMemberScatterItemTooltip(
            makeParam({
                seriesId: "realization:Group A:9:0",
                seriesName: "Scatter A",
                value: [4, 5],
                webvizSeriesMeta: {

                    chart: "memberScatter",
                    axisIndex: 0,
                    roles: ["member"],
                    memberKey: "9",
                },
            }),
            { memberLabel: "Realization" },
        );

        expect(tooltip).toContain("Realization");
        expect(tooltip).not.toContain("Member");
    });

    it("omits member row for non-member series id", () => {
        const tooltip = formatMemberScatterItemTooltip(
            makeParam({
                seriesId: "density:Trace A:points:0",
                seriesName: "Scatter A",
                value: [4, 5],
            }),
        );

        expect(tooltip).toContain("Scatter A");
        expect(tooltip).not.toContain("Member");
    });
});
