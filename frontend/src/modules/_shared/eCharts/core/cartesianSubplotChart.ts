import type { EChartsOption } from "echarts";

import type { AxisDef, SubplotAxesResult } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import type { SubplotLayoutConfig } from "../layout/subplotGridLayout";
import type { BaseChartOptions, SubplotGroup } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ChartSeriesOption, ComposeChartConfig } from "./composeChartOption";

export type CartesianSubplotBuildResult = {
    series: ChartSeriesOption[];
    legendData: string[];
    xAxis: AxisDef;
    yAxis: AxisDef;
    title?: string;
};

export type CartesianChartOptions = BaseChartOptions &
    Omit<ComposeChartConfig, "series" | "legendData"> & {
        layoutConfig?: SubplotLayoutConfig;
        postProcessAxes?: (axes: SubplotAxesResult, allSeries: ChartSeriesOption[]) => void;
    };

/**
 * Orchestrates the subplot → axes → compose pipeline for cartesian chart families.
 * Calls `buildSubplot` per group, assembles axes/grids, applies shared-axis linking,
 * then delegates to `composeChartOption` for the final EChartsOption.
 */
export function buildCartesianSubplotChart<T>(
    subplotGroups: SubplotGroup<T>[],
    buildSubplot: (group: SubplotGroup<T>, axisIndex: number) => CartesianSubplotBuildResult,
    options: CartesianChartOptions = {},
): EChartsOption {
    const groups = subplotGroups.filter((group) => group.traces.length > 0);
    if (groups.length === 0) return {};

    const {
        sharedXAxis, sharedYAxis, layoutConfig,
        postProcessAxes, zoomState, zoomable, dataZoom,
        showLegend, highlightedSubplotIndices,
        ...composeOverrides
    } = options;
    let finalDataZoom = dataZoom;

    // Auto-create inside dataZoom when zoomable or zoomState is set but no explicit dataZoom was provided.
    if (!finalDataZoom && (zoomable || zoomState)) {
        const axisIndices = Array.from({ length: groups.length }, (_, i) => i);
        finalDataZoom = [
            { type: "inside" as const, id: "x", xAxisIndex: axisIndices, filterMode: "none" as const },
            { type: "inside" as const, id: "y", yAxisIndex: axisIndices, filterMode: "none" as const },
        ];
    }

    if (finalDataZoom && zoomState) {
        const dataZoomArray = Array.isArray(finalDataZoom) ? finalDataZoom : [finalDataZoom];

        finalDataZoom = dataZoomArray.map(function applyZoomStateToDataZoom(dz) {
            const state = dz.id === "y" ? zoomState.y : zoomState.x;

            if (!state) return dz;


            return {
                ...dz,
                start: state.start,
                end: state.end,
                ...(state.startValue != null && { startValue: state.startValue }),
                ...(state.endValue != null && { endValue: state.endValue }),
            };
        });
    }
    const layout = computeSubplotGridLayout(groups.length, layoutConfig);
    applyHighlightedSubplots(layout, highlightedSubplotIndices);
    const allSeries: ChartSeriesOption[] = [];
    const axisDefs: Array<{ xAxis: AxisDef; yAxis: AxisDef; title?: string }> = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    groups.forEach(function buildSubplotForAxis(group, axisIndex) {
        const result = buildSubplot(group, axisIndex);
        allSeries.push(...result.series);
        axisDefs.push({
            xAxis: result.xAxis,
            yAxis: result.yAxis,
            title: result.title ?? group.title,
        });

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    });

    const axes = buildSubplotAxes(layout, axisDefs);

    if (postProcessAxes) postProcessAxes(axes, allSeries);
    if (sharedXAxis) linkValueAxes(axes.xAxes, allSeries, "x");
    if (sharedYAxis) linkValueAxes(axes.yAxes, allSeries, "y");

    return composeChartOption(layout, axes, {
        series: allSeries,
        legendData: legendData.length > 0 ? legendData : undefined,
        dataZoom: finalDataZoom,
        showLegend,
        ...composeOverrides,
    });
}

function applyHighlightedSubplots(
    layout: ReturnType<typeof computeSubplotGridLayout>,
    highlightedSubplotIndices?: number[],
): void {
    if (!highlightedSubplotIndices || highlightedSubplotIndices.length === 0) {
        return;
    }

    for (const subplotIndex of highlightedSubplotIndices) {
        const grid = layout.grids[subplotIndex];
        if (!grid) {
            continue;
        }

        grid.show = true;
        grid.borderColor = "#2563eb";
        grid.borderWidth = 1;
    }
}

/**
 * Force all value-type axes in the array to share the same min/max range.
 * Category axes are skipped since they share range via their data array.
 */
function linkValueAxes(
    axes: SubplotAxesResult["xAxes"],
    allSeries: ChartSeriesOption[],
    direction: "x" | "y",
): void {
    const valueAxes = axes.flatMap((axis, axisIndex) => (axis.type === "value" ? [{ axis, axisIndex }] : []));
    if (valueAxes.length < 2) return;

    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (const { axis, axisIndex } of valueAxes) {
        const seriesExtent = computeAxisExtent(allSeries, axisIndex, direction);
        const axisMin = typeof axis.min === "number" ? axis.min : seriesExtent?.min;
        const axisMax = typeof axis.max === "number" ? axis.max : seriesExtent?.max;

        if (typeof axisMin === "number" && Number.isFinite(axisMin)) {
            globalMin = Math.min(globalMin, axisMin);
        }
        if (typeof axisMax === "number" && Number.isFinite(axisMax)) {
            globalMax = Math.max(globalMax, axisMax);
        }
    }

    if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) return;

    for (const { axis } of valueAxes) {
        axis.min = globalMin;
        axis.max = globalMax;
    }
}

type NumericExtent = {
    min: number;
    max: number;
};

function computeAxisExtent(
    allSeries: ChartSeriesOption[],
    axisIndex: number,
    direction: "x" | "y",
): NumericExtent | null {
    let min = Infinity;
    let max = -Infinity;

    for (const series of allSeries) {
        if (getSeriesAxisIndex(series, direction) !== axisIndex) continue;

        const extent = computeSeriesExtent(series, direction);
        if (!extent) continue;

        min = Math.min(min, extent.min);
        max = Math.max(max, extent.max);
    }

    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

function computeSeriesExtent(series: ChartSeriesOption, direction: "x" | "y"): NumericExtent | null {
    const data = getSeriesData(series);
    if (data.length === 0) return null;

    const encodedIndices = getEncodedIndices(series, direction);
    let min = Infinity;
    let max = -Infinity;

    for (const datum of data) {
        const values = extractDatumValues(datum, direction, encodedIndices);
        for (const value of values) {
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    }

    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

function getSeriesAxisIndex(series: ChartSeriesOption, direction: "x" | "y"): number {
    const rawIndex =
        direction === "x" ? (series as { xAxisIndex?: unknown }).xAxisIndex : (series as { yAxisIndex?: unknown }).yAxisIndex;

    return typeof rawIndex === "number" && Number.isFinite(rawIndex) ? rawIndex : 0;
}

function getSeriesData(series: ChartSeriesOption): unknown[] {
    const rawData = (series as { data?: unknown }).data;
    return Array.isArray(rawData) ? rawData : [];
}

function getEncodedIndices(series: ChartSeriesOption, direction: "x" | "y"): number[] | null {
    const encode = (series as { encode?: { x?: unknown; y?: unknown } }).encode;
    const rawIndices = direction === "x" ? encode?.x : encode?.y;
    if (rawIndices == null) return null;

    const indices = (Array.isArray(rawIndices) ? rawIndices : [rawIndices]).filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
    );

    return indices.length > 0 ? indices : null;
}

function extractDatumValues(datum: unknown, direction: "x" | "y", encodedIndices: number[] | null): number[] {
    const value = extractDatumValue(datum);
    if (typeof value === "number") {
        return direction === "y" && Number.isFinite(value) ? [value] : [];
    }
    if (!Array.isArray(value)) return [];

    const indices = encodedIndices ?? getDefaultArrayIndices(value, direction);
    const numericValues: number[] = [];

    for (const index of indices) {
        const candidate = Number(value[index]);
        if (Number.isFinite(candidate)) {
            numericValues.push(candidate);
        }
    }

    return numericValues;
}

function extractDatumValue(datum: unknown): unknown {
    if (datum && typeof datum === "object" && "value" in datum) {
        return (datum as { value?: unknown }).value;
    }
    return datum;
}

function getDefaultArrayIndices(value: unknown[], direction: "x" | "y"): number[] {
    if (value.length === 0) return [];
    if (value.length === 1) return direction === "y" ? [0] : [];
    return direction === "x" ? [0] : [1];
}