import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import {
    buildConvergenceSeries,
    formatConvergenceStatLabel,
    getConvergenceSeriesStatKey,
} from "../series/convergenceSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type ConvergenceChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
};

export function buildConvergenceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ConvergenceChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Realizations", yAxisLabel = "Value" } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => ({
            series: buildConvergenceSubplotSeries(group, axisIndex),
            legendData: group.traces.map((trace) => trace.name),
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        }),
        containerSize,
        {
            tooltip: {
                trigger: "axis" as const,
                axisPointer: { type: "line" as const },
                formatter: formatConvergenceTooltip,
            },
        },
    );
}

function buildConvergenceSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    for (const trace of group.traces) {
        series.push(...assignSeriesToAxis(buildConvergenceSeries(trace, axisIndex), axisIndex));
    }

    return series;
}

function formatConvergenceTooltip(params: unknown): string {
    if (!Array.isArray(params) || params.length === 0) return "";

    const entries = params.filter(isConvergenceTooltipEntry);
    if (entries.length === 0) return "";

    const headerValue = entries[0].axisValueLabel ?? entries[0].axisValue;
    const rows = [] as Array<{ label: string; value: string; color?: string }>;

    for (const entry of entries) {
        const statKey = getConvergenceSeriesStatKey(entry.seriesId);
        if (!statKey) continue;

        const value = extractConvergenceTooltipValue(entry.value);
        rows.push({
            label: `${entry.seriesName} (${formatConvergenceStatLabel(statKey)})`,
            value: formatNumber(value),
            color: entry.color,
        });
    }

    return formatCompactTooltip(`Realization: ${headerValue}`, rows);
}

type ConvergenceTooltipEntry = {
    axisValue?: string | number;
    axisValueLabel?: string | number;
    seriesId?: string;
    seriesName?: string;
    color?: string;
    value?: unknown;
};

function isConvergenceTooltipEntry(value: unknown): value is ConvergenceTooltipEntry {
    return Boolean(value && typeof value === "object");
}

function extractConvergenceTooltipValue(value: unknown): number {
    if (Array.isArray(value)) {
        return Number(value[1] ?? value[0] ?? 0);
    }

    return Number(value ?? 0);
}
