import type { EChartsOption } from "echarts";

import type { BaseChartOptions } from "..";
import type { AxisDef, SubplotAxesResult } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import type { SubplotLayoutConfig } from "../layout/subplotGridLayout";
import type { SubplotGroup } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ChartSeriesOption, ComposeChartConfig } from "./composeChartOption";

export type CartesianChartSeries = ChartSeriesOption;

export type CartesianSubplotBuildResult = {
    series: CartesianChartSeries[];
    legendData: string[];
    xAxis: AxisDef;
    yAxis: AxisDef;
    title?: string;
};

export type CartesianChartComposeOverrides = Pick<
    ComposeChartConfig,
    "tooltip" | "axisPointer" | "dataZoom" | "visualMap" | "toolbox"
>;

export type CartesianChartOptions = CartesianChartComposeOverrides & BaseChartOptions & {
    layoutConfig?: SubplotLayoutConfig;
    postProcessAxes?: (axes: SubplotAxesResult, allSeries: ChartSeriesOption[]) => void;
};

export function buildCartesianSubplotChart<T>(
    subplotGroups: SubplotGroup<T>[],
    buildSubplot: (group: SubplotGroup<T>, axisIndex: number) => CartesianSubplotBuildResult,
    options: CartesianChartOptions = {},
): EChartsOption {
    const groups = subplotGroups.filter((group) => group.traces.length > 0);
    if (groups.length === 0) return {};

    const {
        containerSize, sharedXAxis, sharedYAxis, layoutConfig,
        postProcessAxes, zoomState, dataZoom, ...composeOverrides
    } = options;
    let finalDataZoom = dataZoom;

    if (dataZoom && zoomState) {
        const dataZoomArray = Array.isArray(dataZoom) ? dataZoom : [dataZoom];

        finalDataZoom = dataZoomArray.map(dz => {
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
    const allSeries: CartesianChartSeries[] = [];
    const axisDefs: Array<{ xAxis: AxisDef; yAxis: AxisDef; title?: string }> = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    groups.forEach((group, axisIndex) => {
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
        containerSize, dataZoom: finalDataZoom,
        ...composeOverrides,
    });
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