import type { EChartsOption } from "echarts";

import type { BaseChartOptions, SubplotGroup } from "../types";

import { aggregateSubplotTraces } from "./aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "./cartesianSubplotChart";
import type { CartesianChartOptions, CartesianSubplotBuildResult } from "./cartesianSubplotChart";
import type { ChartSeriesOption, SeriesBuildResult } from "./composeChartOption";

export interface SimpleChartFactoryConfig<TTrace, TSeriesOptions> {
    /** Default x-axis label when not provided in options. */
    defaultXAxisLabel: string;
    /** Default y-axis label when not provided in options. */
    defaultYAxisLabel: string;
    /** X-axis type. */
    xAxisType?: "value" | "category";
    /** Y-axis type. */
    yAxisType?: "value" | "category";
    /** Whether x-axis should use scale mode (auto-range to data). */
    xAxisScale?: boolean;
    /** Whether y-axis should use scale mode. */
    yAxisScale?: boolean;
    /** Series builder function applied per trace via aggregateSubplotTraces. */
    buildSeries: (trace: TTrace, axisIndex: number, options: TSeriesOptions) => SeriesBuildResult;
    /** Optional tooltip config to inject. */
    buildTooltip?: (seriesOptions: TSeriesOptions) => Record<string, unknown>;
    /** Optional post-process hook for axes (e.g. clamping exceedance y to 0..100). */
    postProcessAxes?: CartesianChartOptions["postProcessAxes"];
}

export type SimpleChartOptions<TSeriesOptions> = BaseChartOptions & TSeriesOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
};

/**
 * Creates a chart builder for families that follow the simple aggregate pattern:
 * iterate traces per subplot → build series → compose with cartesian layout.
 *
 * Convergence, density, exceedance, and member scatter all use this pattern.
 * Histogram and timeseries have more complex pipelines and don't use this factory.
 */
export function createSimpleChartBuilder<TTrace, TSeriesOptions = Record<string, unknown>>(
    config: SimpleChartFactoryConfig<TTrace, TSeriesOptions>,
) {
    return function buildChart(
        subplotGroups: SubplotGroup<TTrace>[],
        options: SimpleChartOptions<TSeriesOptions> = {} as SimpleChartOptions<TSeriesOptions>,
    ): EChartsOption {
        const xAxisLabel = options.xAxisLabel ?? config.defaultXAxisLabel;
        const yAxisLabel = options.yAxisLabel ?? config.defaultYAxisLabel;
        const xAxisScale = config.xAxisScale;
        const yAxisScale = config.yAxisScale;

        function buildSubplot(
            group: SubplotGroup<TTrace>,
            axisIndex: number,
        ): CartesianSubplotBuildResult {
            const { series, legendData } = aggregateSubplotTraces({
                traces: group.traces,
                axisIndex,
                options: options as TSeriesOptions,
                buildFn: config.buildSeries as (trace: TTrace, axisIndex: number, options: TSeriesOptions) => { series: ChartSeriesOption[]; legendData: string[] },
            });

            return {
                series,
                legendData,
                xAxis: { type: config.xAxisType ?? "value", scale: xAxisScale, label: xAxisLabel },
                yAxis: { type: config.yAxisType ?? "value", scale: yAxisScale, label: yAxisLabel },
                title: group.title,
            };
        }

        const composeOverrides: CartesianChartOptions = {
            ...options,
        };

        if (config.buildTooltip) {
            composeOverrides.tooltip = config.buildTooltip(options as TSeriesOptions);
        }

        if (config.postProcessAxes) {
            composeOverrides.postProcessAxes = config.postProcessAxes;
        }

        return buildCartesianSubplotChart(subplotGroups, buildSubplot, composeOverrides);
    };
}
