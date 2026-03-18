import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../types";
import { getSeriesIdentifier, readSeriesMetadata } from "../../utils/seriesMetadata";

import { buildConvergenceSeries } from "./series";
import { buildConvergenceTooltip } from "./tooltips";

export type ConvergenceChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};
export type ConvergenceStatisticKey = "p90" | "mean" | "p10";

export function buildConvergenceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ConvergenceChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Realizations", yAxisLabel = "Value", sharedXAxis, sharedYAxis } = options;
    const statKeyBySeriesId = new Map<string, ConvergenceStatisticKey>();
    const buildSubplot = function buildConvergenceSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = buildConvergenceSubplot(group, axisIndex, statKeyBySeriesId);

        return {
            series,
            legendData,
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", scale: true, label: yAxisLabel },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: buildConvergenceTooltip({ statKeyBySeriesId }),
        },
    );
}

function buildConvergenceSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    statKeyBySeriesId: Map<string, ConvergenceStatisticKey>,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildConvergenceSeries(trace, axisIndex);
        registerConvergenceSummarySeries(result.series, statKeyBySeriesId);
        series.push(...result.series);

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    }

    return { series, legendData };
}

function registerConvergenceSummarySeries(
    series: CartesianChartSeries[],
    statKeyBySeriesId: Map<string, ConvergenceStatisticKey>,
): void {
    for (const seriesOption of series) {
        const metadata = readSeriesMetadata(seriesOption);
        if (metadata?.chart !== "convergence" || !metadata.roles.includes("summary") || !metadata.statKey) continue;

        const seriesId = getSeriesIdentifier(seriesOption);
        if (!seriesId) continue;

        statKeyBySeriesId.set(seriesId, metadata.statKey as ConvergenceStatisticKey);
    }
}