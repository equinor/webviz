import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import { buildBarSeries } from "../series/barSeries";
import type { BuildBarSeriesOptions } from "../series/barSeries";
import type { BarTrace, ContainerSize, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";

export type BarChartOptions = BuildBarSeriesOptions & {
    yAxisLabel?: string;
};

export function buildBarChart(
    subplotGroups: SubplotGroup<BarTrace>[],
    options: BarChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { yAxisLabel = "Value", ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => buildBarSubplot(group, axisIndex, seriesOptions, yAxisLabel),
        containerSize,
        { tooltip: { trigger: "axis" as const, formatter: formatBarTooltip } },
    );
}

function buildBarSubplot(
    group: SubplotGroup<BarTrace>,
    axisIndex: number,
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): CartesianSubplotBuildResult {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    let categoryData: (string | number)[] = [];

    for (const trace of group.traces) {
        const result = buildBarSeries(trace, options);
        if (categoryData.length === 0) categoryData = result.categoryData;
        series.push(...assignSeriesToAxis(result.series, axisIndex));
        legendData.push(result.legendEntry);
    }

    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryData },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}

type BarTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

function formatBarTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is BarTooltipEntry => entry.seriesType === "bar",
    );
    if (entries.length === 0) return "";

    const headerValue = entries[0].axisValueLabel ?? entries[0].axisValue ?? entries[0].name ?? "";
    return formatCompactTooltip(
        String(headerValue),
        entries.map((entry) => ({
            label: entry.seriesName ?? "",
            value: formatNumber(extractBarTooltipValue(entry.value)),
            color: typeof entry.color === "string" ? entry.color : undefined,
        })),
    );
}

function extractBarTooltipValue(value: unknown): number {
    if (Array.isArray(value)) {
        return Number(value[value.length - 1] ?? value[1] ?? value[0] ?? 0);
    }

    return Number(value ?? 0);
}
