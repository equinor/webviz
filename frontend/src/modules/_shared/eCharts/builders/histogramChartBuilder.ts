import type { EChartsOption } from "echarts";
import type { CustomSeriesOption, LineSeriesOption, ScatterSeriesOption } from "echarts/charts";
import type {
    CallbackDataParams,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
} from "echarts/types/dist/shared";

import { HistogramType } from "@modules/_shared/histogram";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { SubplotAxesResult } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../utils";
import type { HistogramBarGeometry, HistogramTraceData } from "../utils/histogram";

import { composeChartOption } from "./composeChartOption";

export type HistogramChartOptions = {
    numBins?: number;
    histogramType?: HistogramType;
    showStatisticalMarkers?: boolean;
    showStatisticalLabels?: boolean;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
    borderColor?: string;
    borderWidth?: number;
};

type HistogramChartSeries = CustomSeriesOption | LineSeriesOption | ScatterSeriesOption;

type ResolvedHistogramChartOptions = Required<HistogramChartOptions>;

type HistogramBarValue = [number, number, number, number];

type RugPointValue = [number, number];

type HistogramBarDatum = {
    value: HistogramBarValue;
    count: number;
    percentage: number;
};

type RugPointDatum = {
    value: RugPointValue;
    realizationId: number;
};

type HistogramGroupSeriesResult = {
    series: HistogramChartSeries[];
    legendData: string[];
    yMax: number;
};

export function buildHistogramChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: HistogramChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const groups = subplotGroups.filter((group) => group.traces.length > 0);
    if (groups.length === 0) return {};

    const config = resolveHistogramChartOptions(options);

    const layout = computeSubplotGridLayout(groups.length);
    const axes = buildHistogramAxes(layout, groups);
    const { allSeries, legendData, yMaxByAxis } = buildAllSeries(groups, config);

    applyYAxisExtents(axes, yMaxByAxis, config.showRealizationPoints);

    return composeChartOption(layout, axes, {
        series: allSeries,
        legendData,
        containerSize,
    });
}

function resolveHistogramChartOptions(options: HistogramChartOptions): ResolvedHistogramChartOptions {
    return {
        numBins: options.numBins ?? 15,
        histogramType: options.histogramType ?? HistogramType.Overlay,
        showStatisticalMarkers: options.showStatisticalMarkers ?? false,
        showStatisticalLabels: options.showStatisticalLabels ?? false,
        showRealizationPoints: options.showRealizationPoints ?? false,
        showPercentageInBar: options.showPercentageInBar ?? false,
        borderColor: options.borderColor ?? "black",
        borderWidth: options.borderWidth ?? 1,
    };
}

function buildHistogramAxes(layout: SubplotLayoutResult, groups: SubplotGroup<DistributionTrace>[]): SubplotAxesResult {
    return buildSubplotAxes(
        layout,
        groups.map((group) => ({
            xAxis: { type: "value", label: "Value" },
            yAxis: { type: "value", label: "Percentage (%)" },
            title: group.title,
        })),
    );
}

function buildAllSeries(
    groups: SubplotGroup<DistributionTrace>[],
    config: ResolvedHistogramChartOptions,
): { allSeries: HistogramChartSeries[]; legendData: string[]; yMaxByAxis: number[] } {
    const allSeries: HistogramChartSeries[] = [];
    const legendData: string[] = [];
    const yMaxByAxis: number[] = [];
    const seenLegend = new Set<string>();

    groups.forEach((group, axisIndex) => {
        const { series, legendData: groupLegendData, yMax } = buildGroupSeries(group, axisIndex, config);
        allSeries.push(...series);
        yMaxByAxis[axisIndex] = yMax;

        for (const legendName of groupLegendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    });

    return { allSeries, legendData, yMaxByAxis };
}

function buildGroupSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    config: ResolvedHistogramChartOptions,
): HistogramGroupSeriesResult {
    const traceData = computeHistogramTraceData(group.traces, config.numBins);
    const { barsByTrace, yMax } = computeHistogramLayout(traceData, config.histogramType);
    const series: HistogramChartSeries[] = [];

    traceData.forEach((traceDataEntry, traceIndex) => {
        series.push(
            ...buildTraceSeries(
                traceDataEntry,
                barsByTrace[traceIndex] ?? [],
                axisIndex,
                yMax,
                group.traces.length,
                config,
            ),
        );
    });

    return {
        series,
        legendData: traceData.map((entry) => entry.trace.name),
        yMax,
    };
}

function buildTraceSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    yMax: number,
    traceCount: number,
    config: ResolvedHistogramChartOptions,
): HistogramChartSeries[] {
    const series: HistogramChartSeries[] = [];
    const barOpacity = computeBarOpacity(config, traceCount);

    series.push(createHistogramBarSeries(traceDataEntry, bars, axisIndex, barOpacity, config));

    if (config.showStatisticalMarkers) {
        series.push(
            ...createHistogramStatLines(
                traceDataEntry.stats,
                yMax * 1.05,
                traceDataEntry.trace.name,
                traceDataEntry.trace.color,
                axisIndex,
                config.showStatisticalLabels,
            ),
        );
    }

    if (config.showRealizationPoints) {
        series.push(createHistogramRugSeries(traceDataEntry, axisIndex));
    }

    return series;
}

function computeBarOpacity(config: ResolvedHistogramChartOptions, traceCount: number): number {
    if (config.histogramType === HistogramType.Overlay && traceCount > 1) return 0.55;
    return config.showStatisticalMarkers ? 0.6 : 1;
}

function createHistogramBarSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    opacity: number,
    config: ResolvedHistogramChartOptions,
): CustomSeriesOption {
    return {
        type: "custom",
        name: traceDataEntry.trace.name,
        itemStyle: { color: traceDataEntry.trace.color, borderColor: traceDataEntry.trace.color },
        data: bars.map(toHistogramBarDatum),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        encode: { x: [0, 1], y: [2, 3] },
        z: 2,
        renderItem: createHistogramBarRenderItem(
            traceDataEntry.trace.color,
            opacity,
            config.borderColor,
            config.borderWidth,
            config.showPercentageInBar,
        ),
        tooltip: {
            formatter: (params: CallbackDataParams) =>
                formatHistogramBarTooltip(params, traceDataEntry.trace.name, traceDataEntry.trace.color),
        },
    };
}

function createHistogramRugSeries(traceDataEntry: HistogramTraceData, axisIndex: number): ScatterSeriesOption {
    return {
        type: "scatter",
        name: traceDataEntry.trace.name,
        data: traceDataEntry.trace.values.map((value, valueIndex) => ({
            value: [value, -2] satisfies RugPointValue,
            realizationId: traceDataEntry.trace.realizationIds?.[valueIndex] ?? valueIndex,
        })),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        symbol: "rect",
        symbolSize: [1.5, 10],
        itemStyle: { color: traceDataEntry.trace.color, opacity: 0.6 },
        z: 3,
        tooltip: {
            formatter: (params: CallbackDataParams) =>
                formatHistogramRugTooltip(params, traceDataEntry.trace.name, traceDataEntry.trace.color),
        },
    };
}

function applyYAxisExtents(axes: SubplotAxesResult, yMaxByAxis: number[], showRealizationPoints: boolean): void {
    yMaxByAxis.forEach((yMax, axisIndex) => {
        const yAxis = axes.yAxes[axisIndex];
        axes.yAxes[axisIndex] = {
            ...yAxis,
            min: showRealizationPoints ? -4 : 0,
            max: Math.max(yMax * 1.1, 1),
        };
    });
}

function createHistogramStatLines(
    stats: Pick<HistogramTraceData["stats"], "p10" | "mean" | "p90">,
    maxPct: number,
    traceName: string,
    color: string,
    axisIndex: number,
    showLabels: boolean,
): LineSeriesOption[] {
    function makeLine(value: number, label: string, dash: "solid" | "dashed"): LineSeriesOption {
        return {
            type: "line",
            name: traceName,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: [
                [value, 0],
                [value, maxPct],
            ],
            lineStyle: { color, width: 4, type: dash },
            symbol: "none",
            silent: true,
            label: showLabels
                ? {
                      show: true,
                      position: "insideTop",
                      formatter: `${label}: ${formatNumber(value)}`,
                      fontSize: 11,
                  }
                : undefined,
        };
    }

    return [
        makeLine(stats.p10, "P10", "dashed"),
        makeLine(stats.mean, "Mean", "solid"),
        makeLine(stats.p90, "P90", "dashed"),
    ];
}

function createHistogramBarRenderItem(
    color: string,
    opacity: number,
    borderColor: string,
    borderWidth: number,
    showPercentageInBar: boolean,
): NonNullable<CustomSeriesOption["renderItem"]> {
    return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
        const xStart = Number(api.value(0));
        const xEnd = Number(api.value(1));
        const yStart = Number(api.value(2));
        const yEnd = Number(api.value(3));

        const bottomLeft = api.coord([xStart, yStart]);
        const topRight = api.coord([xEnd, yEnd]);
        const rect = {
            x: bottomLeft[0],
            y: topRight[1],
            width: Math.max(topRight[0] - bottomLeft[0], 1),
            height: Math.max(bottomLeft[1] - topRight[1], 0),
        };

        const barElement = {
            type: "rect" as const,
            shape: rect,
            style: {
                fill: color,
                opacity,
                stroke: borderColor,
                lineWidth: borderWidth,
            },
        };

        const labelElements =
            showPercentageInBar && yEnd > yStart
                ? [
                      {
                          type: "text" as const,
                          style: {
                              text: `${(yEnd - yStart).toFixed(1)}%`,
                              x: rect.x + rect.width / 2,
                              y: rect.y - 4,
                              textAlign: "center" as const,
                              textVerticalAlign: "bottom" as const,
                              fontSize: 10,
                              fill: "#333",
                          },
                      },
                  ]
                : [];

        return {
            type: "group",
            children: [barElement, ...labelElements],
        };
    };
}

function toHistogramBarDatum(bar: HistogramBarGeometry): HistogramBarDatum {
    return {
        value: [bar.xStart, bar.xEnd, bar.yStart, bar.yEnd],
        count: bar.count,
        percentage: bar.percentage,
    };
}

function formatHistogramBarTooltip(params: CallbackDataParams, traceName: string, traceColor: string): string {
    const value = toHistogramBarValue(params.value);
    if (!value) return traceName;

    const [xStart, xEnd, yStart, yEnd] = value;
    const percentage = yEnd - yStart;

    return formatCompactTooltip(traceName, [
        { label: "Range", value: `${formatNumber(xStart)} - ${formatNumber(xEnd)}`, color: traceColor },
        { label: "Percentage", value: `${percentage.toFixed(2)}%`, color: traceColor },
    ]);
}

function formatHistogramRugTooltip(params: CallbackDataParams, traceName: string, traceColor: string): string {
    const value = toRugPointValue(params.value);
    if (!value) return traceName;

    const realizationId = isRugPointDatum(params.data) ? params.data.realizationId : params.dataIndex;

    return formatCompactTooltip(traceName, [
        { label: "Value", value: formatNumber(value[0]), color: traceColor },
        { label: "Realization", value: String(realizationId), color: traceColor },
    ]);
}

function toHistogramBarValue(value: CallbackDataParams["value"]): HistogramBarValue | null {
    if (!Array.isArray(value) || value.length < 4) return null;
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
}

function toRugPointValue(value: CallbackDataParams["value"]): RugPointValue | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

function isRugPointDatum(data: unknown): data is RugPointDatum {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Partial<RugPointDatum>;
    return Array.isArray(candidate.value) && typeof candidate.realizationId === "number";
}
