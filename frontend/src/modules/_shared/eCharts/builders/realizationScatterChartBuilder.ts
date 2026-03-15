import type { EChartsOption } from "echarts";

import { formatRealizationScatterTooltip } from "../interaction/tooltipDistributionFormatters";
import { buildRealizationScatterSeries } from "../series/realizationScatterSeries";
import type { ContainerSize, RealizationScatterTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type RealizationScatterChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildRealizationScatterChart(
    subplotGroups: SubplotGroup<RealizationScatterTrace>[],
    options: RealizationScatterChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "X", yAxisLabel = "Y", sharedXAxis, sharedYAxis } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => {
            const series: CartesianChartSeries[] = [];
            const legendData: string[] = [];
            const seenLegend = new Set<string>();

            for (const trace of group.traces) {
                const result = buildRealizationScatterSeries(trace, axisIndex);
                series.push(...result.series);
                for (const name of result.legendData) {
                    if (!seenLegend.has(name)) {
                        legendData.push(name);
                        seenLegend.add(name);
                    }
                }
            }

            return {
                series,
                legendData,
                xAxis: { type: "value", label: xAxisLabel },
                yAxis: { type: "value", label: yAxisLabel },
                title: group.title,
            };
        },
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: { trigger: "item" as const, formatter: formatRealizationScatterTooltip },
        },
    );
}
