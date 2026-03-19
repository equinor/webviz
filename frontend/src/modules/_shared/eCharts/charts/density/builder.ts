import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { DistributionTrace, SubplotGroup } from "../../types";

import { buildDensitySeries, type DensityDisplayOptions } from "./series";
import { BaseChartOptions } from "../..";

// 1. Clean, nested options structure
export interface DensityChartOptions {
    base?: BaseChartOptions;
    series?: DensityDisplayOptions & {
        xAxisLabel?: string;
        yAxisLabel?: string;
    };
}

export function buildDensityChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: DensityChartOptions = {},
): EChartsOption {
    // 2. Safely extract series-level configurations
    const seriesOptions = options.series ?? {};
    const xAxisLabel = seriesOptions.xAxisLabel ?? "Value";
    const yAxisLabel = seriesOptions.yAxisLabel ?? "Density";

    const buildSubplot = function buildDensitySubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            options: seriesOptions,
            buildFn: buildDensitySeries
        });

        return {
            series,
            legendData,
            xAxis: { type: "value", scale: true, label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        options.base ?? {}
    );
}