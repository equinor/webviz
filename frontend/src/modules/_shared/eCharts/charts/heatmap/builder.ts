import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BaseChartOptions, HeatmapTrace, SubplotGroup } from "../../types";

import { buildHeatmapSeries } from "./series";
import { buildHeatmapTooltip } from "./tooltips";
import {
    buildHeatmapDatasets,
    buildHeatmapVisualMap,
    computeHeatmapValueRange,
    normalizeHeatmapSubplotGroups
} from "./utils";

export type HeatmapChartOptions = BaseChartOptions & {
    valueLabel: string;
};

/** Builds a heatmap chart with per-cell coloring and a visual-map legend. */
export function buildHeatmapChart(
    subplotGroups: SubplotGroup<HeatmapTrace>[],
    options: HeatmapChartOptions,
): EChartsOption {

    const { valueLabel } = options;

    const heatmapSubplotGroups = normalizeHeatmapSubplotGroups(subplotGroups);
    const datasets = buildHeatmapDatasets(heatmapSubplotGroups);

    if (datasets.length === 0) return {};

    const valueRange = computeHeatmapValueRange(datasets);

    const buildSubplot = function buildHeatmapSubplotForAxis(
        group: SubplotGroup<HeatmapTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        let xLabels: string[] = [];
        let yLabels: string[] = [];

        const buildAndCaptureHeatmap = function buildAndCaptureHeatmap(trace: HeatmapTrace, idx: number) {

            if (xLabels.length === 0) xLabels = trace.xLabels;
            if (yLabels.length === 0) yLabels = trace.yLabels;

            return buildHeatmapSeries(trace, idx);
        };

        const { series } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            options: {},
            buildFn: buildAndCaptureHeatmap
        });

        return {
            series,
            legendData: [],
            xAxis: { type: "category", data: xLabels, splitArea: true },
            yAxis: { type: "category", data: yLabels, splitArea: true },
            title: group.title,
        };
    };


    return buildCartesianSubplotChart(
        heatmapSubplotGroups,
        buildSubplot,
        {
            ...options,
            layoutConfig: { marginRightPct: 8 },
            tooltip: buildHeatmapTooltip(datasets, valueLabel),
            visualMap: buildHeatmapVisualMap(valueRange),
        }
    );
}