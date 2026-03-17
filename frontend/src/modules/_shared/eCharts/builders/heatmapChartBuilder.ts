import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { buildHeatmapTooltip, type HeatmapTooltipDataset } from "../interaction/tooltips/heatmap";
import type { SubplotAxisDef } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import { buildHeatmapSeries } from "../series";
import type { ContainerSize, HeatmapTrace, SubplotGroup } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ChartSeriesOption } from "./composeChartOption";

type HeatmapDatasetEntry = HeatmapTooltipDataset & {
    trace: HeatmapTrace;
};

type HeatmapValueRange = {
    min: number;
    max: number;
};

export function buildHeatmapChart(
    subplotGroups: SubplotGroup<HeatmapTrace>[],
    valueLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
): EChartsOption {
    const datasets = flattenHeatmapDatasets(subplotGroups);
    if (datasets.length === 0) return {};

    const layout = computeSubplotGridLayout(datasets.length, { marginRightPct: 8 });
    const axes = buildHeatmapAxes(layout, datasets);
    const series = buildHeatmapSubplotSeries(datasets, activeTimestampUtcMs);
    const valueRange = computeHeatmapValueRange(datasets);

    return composeChartOption(layout, axes, {
        series,
        containerSize,
        tooltip: buildHeatmapTooltip(datasets, valueLabel),
        visualMap: buildHeatmapVisualMap(valueRange),
    });
}

function flattenHeatmapDatasets(subplotGroups: SubplotGroup<HeatmapTrace>[]): HeatmapDatasetEntry[] {
    return subplotGroups.flatMap((group) =>
        group.traces.map((trace) => ({
            trace,
            title: group.traces.length > 1 ? trace.name : group.title || trace.name,
        })),
    );
}

function buildHeatmapAxes(layout: SubplotLayoutResult, datasets: HeatmapDatasetEntry[]) {
    const axisDefs: SubplotAxisDef[] = datasets.map(({ trace, title }) => ({
        xAxis: { type: "category", data: trace.xLabels, splitArea: true },
        yAxis: { type: "category", data: trace.yLabels, splitArea: true },
        title,
    }));

    return buildSubplotAxes(layout, axisDefs);
}

function buildHeatmapSubplotSeries(
    datasets: HeatmapDatasetEntry[],
    activeTimestampUtcMs: number | null,
): ChartSeriesOption[] {
    const series: ChartSeriesOption[] = [];

    for (const [axisIndex, { trace }] of datasets.entries()) {
        const activeDate = resolveActiveHeatmapDate(trace, activeTimestampUtcMs);
        const result = buildHeatmapSeries(trace, axisIndex, activeDate);
        series.push(...result.series);
    }

    return series;
}

function resolveActiveHeatmapDate(trace: HeatmapTrace, activeTimestampUtcMs: number | null): string | null {
    if (activeTimestampUtcMs == null) return null;
    return trace.xLabels[trace.timestampsUtcMs.indexOf(activeTimestampUtcMs)] ?? null;
}

function computeHeatmapValueRange(datasets: HeatmapDatasetEntry[]): HeatmapValueRange {
    let min = Infinity;
    let max = -Infinity;

    for (const { trace } of datasets) {
        min = Math.min(min, trace.minValue);
        max = Math.max(max, trace.maxValue);
    }

    return {
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 1,
    };
}

function buildHeatmapVisualMap(valueRange: HeatmapValueRange) {
    return {
        min: valueRange.min,
        max: valueRange.max,
        calculable: true,
        orient: "vertical" as const,
        right: 0,
        top: "center",
        inRange: {
            color: [
                "#313695",
                "#4575b4",
                "#74add1",
                "#abd9e9",
                "#e0f3f8",
                "#ffffbf",
                "#fee090",
                "#fdae61",
                "#f46d43",
                "#d73027",
                "#a50026",
            ],
        },
        formatter: formatHeatmapVisualMapValue,
    };
}

function formatHeatmapVisualMapValue(value: unknown): string {
    return formatNumber(Number(value), 3);
}
