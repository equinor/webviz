import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import { buildDistributionSeries } from "../series/distributionSeries";
import type { DistributionDisplayOptions } from "../series/distributionSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type DistributionChartOptions = DistributionDisplayOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
};

export function buildDistributionChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: DistributionChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel = "Density", ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => ({
            series: buildDistributionSubplotSeries(group, axisIndex, seriesOptions),
            legendData: group.traces.map((trace) => trace.name),
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        }),
        containerSize,
        { tooltip: { trigger: "item" as const, formatter: formatDistributionTooltip } },
    );
}

function buildDistributionSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: DistributionDisplayOptions,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    for (const trace of group.traces) {
        series.push(...assignSeriesToAxis(buildDistributionSeries(trace, options, axisIndex), axisIndex));
    }

    return series;
}

function formatDistributionTooltip(params: CallbackDataParams): string {
    const point = extractDistributionTooltipPoint(params.value);
    if (!point) return "";

    const header = params.seriesName ?? "";
    const color = typeof params.color === "string" ? params.color : undefined;

    if (params.seriesType === "scatter") {
        return formatCompactTooltip(header, [
            { label: "Value", value: formatNumber(point[0]), color },
            { label: "Realization", value: String(extractDistributionRealizationId(params)), color },
        ]);
    }

    return formatCompactTooltip(header, [
        { label: "Value", value: formatNumber(point[0]), color },
        { label: "Density", value: formatNumber(point[1], 4), color },
    ]);
}

function extractDistributionTooltipPoint(value: unknown): [number, number] | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

function extractDistributionRealizationId(params: CallbackDataParams): number {
    if (params.data && typeof params.data === "object" && "realizationId" in params.data) {
        return Number((params.data as { realizationId?: number }).realizationId ?? params.dataIndex);
    }

    return params.dataIndex;
}
