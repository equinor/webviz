import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ContainerSize, HeatmapTrace, SubplotGroup } from "../../types";

import { buildHeatmapSeries } from "./series";
import { buildHeatmapTooltip, type HeatmapTooltipDataset } from "./tooltips";

type HeatmapDatasetEntry = HeatmapTooltipDataset & {
    trace: HeatmapTrace;
};

type HeatmapValueRange = {
    min: number;
    max: number;
};

export type HeatmapChartOptions = {
    valueLabel: string;
    activeTimestampUtcMs?: number | null;
};

export function buildHeatmapChart(
    subplotGroups: SubplotGroup<HeatmapTrace>[],
    options: HeatmapChartOptions,
    containerSize?: ContainerSize,
): EChartsOption {
    const { valueLabel, activeTimestampUtcMs = null } = options;
    const heatmapSubplotGroups = normalizeHeatmapSubplotGroups(subplotGroups);
    const datasets = buildHeatmapDatasets(heatmapSubplotGroups);
    if (datasets.length === 0) return {};

    const valueRange = computeHeatmapValueRange(datasets);
    const buildSubplot = function buildHeatmapSubplotForAxis(
        group: SubplotGroup<HeatmapTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const trace = group.traces[0];
        if (!trace) {
            return {
                series: [],
                legendData: [],
                xAxis: { type: "category" },
                yAxis: { type: "category" },
                title: group.title,
            };
        }

        const activeDate = resolveActiveHeatmapDate(trace, activeTimestampUtcMs);
        const result = buildHeatmapSeries(trace, axisIndex, activeDate);

        return {
            series: result.series,
            legendData: [],
            xAxis: { type: "category", data: trace.xLabels, splitArea: true },
            yAxis: { type: "category", data: trace.yLabels, splitArea: true },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(heatmapSubplotGroups, buildSubplot, {
        containerSize,
        layoutConfig: { marginRightPct: 8 },
        tooltip: buildHeatmapTooltip(datasets, valueLabel),
        visualMap: buildHeatmapVisualMap(valueRange),
    });
}

function normalizeHeatmapSubplotGroups(subplotGroups: SubplotGroup<HeatmapTrace>[]): SubplotGroup<HeatmapTrace>[] {
    return subplotGroups.flatMap((group) =>
        group.traces.map((trace) => ({
            title: group.traces.length > 1 ? trace.name : group.title || trace.name,
            traces: [trace],
        })),
    );
}

function buildHeatmapDatasets(subplotGroups: SubplotGroup<HeatmapTrace>[]): HeatmapDatasetEntry[] {
    return subplotGroups.flatMap((group) => {
        const trace = group.traces[0];
        return trace ? [{ trace, title: group.title || trace.name }] : [];
    });
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