import { HistogramType } from "@modules/_shared/histogram";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { DistributionTrace, PointStatistics } from "../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../utils/histogram";
import { computePointStatistics } from "../utils/statistics";

export type HistogramDisplayOptions = {
    numBins?: number;
    showStatisticalMarkers?: boolean;
    showStatisticalLabels?: boolean;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
};

export function buildHistogramSeries(
    trace: DistributionTrace,
    options: HistogramDisplayOptions = {},
    axisIndex = 0,
): any[] {
    const {
        numBins = 15,
        showStatisticalMarkers = false,
        showStatisticalLabels = false,
        showRealizationPoints = false,
        showPercentageInBar = false,
        color = trace.color,
        opacity = showStatisticalMarkers ? 0.6 : 1,
        borderColor = "black",
        borderWidth = 1,
    } = options;

    if (trace.values.length === 0) return [];

    const stats = computePointStatistics(trace.values);
    const traceData = computeHistogramTraceData([trace], numBins);
    const histogramLayout = computeHistogramLayout(traceData, HistogramType.Overlay);
    const bars = histogramLayout.barsByTrace[0] ?? [];
    const maxPercentage = histogramLayout.yMax;

    const series: any[] = [];

    series.push({
        type: "custom",
        name: trace.name,
        data: bars.map((bar, index) => ({
            value: [bar.xStart, bar.xEnd, bar.yStart, bar.yEnd],
            binIndex: index,
            count: bar.count,
            percentage: bar.percentage,
        })),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        renderItem(params: any, api: any) {
            const startValue = api.value(0) as number;
            const endValue = api.value(1) as number;
            const yStart = api.value(2) as number;
            const yEnd = api.value(3) as number;
            const percentage = yEnd - yStart;

            const bottomLeft = api.coord([startValue, yStart]);
            const topRight = api.coord([endValue, yEnd]);
            const rect = {
                x: bottomLeft[0],
                y: topRight[1],
                width: Math.max(topRight[0] - bottomLeft[0], 1),
                height: Math.max(bottomLeft[1] - topRight[1], 0),
            };

            const children: any[] = [
                {
                    type: "rect",
                    shape: rect,
                    style: {
                        fill: color,
                        opacity,
                        stroke: borderColor,
                        lineWidth: borderWidth,
                    },
                },
            ];

            if (showPercentageInBar && percentage > 0) {
                children.push({
                    type: "text",
                    style: {
                        text: `${percentage.toFixed(1)}%`,
                        x: rect.x + rect.width / 2,
                        y: rect.y - 4,
                        textAlign: "center",
                        textVerticalAlign: "bottom",
                        fontSize: 10,
                        fill: "#333",
                    },
                });
            }

            return {
                type: "group",
                children,
            };
        },
        tooltip: {
            formatter: (params: any) => {
                const [startValue, endValue, yStart, yEnd] = params.value as [number, number, number, number];
                const percentage = yEnd - yStart;
                return formatCompactTooltip(trace.name, [
                    { label: "Range", value: `${formatNumber(startValue)} - ${formatNumber(endValue)}` },
                    { label: "Percentage", value: `${percentage.toFixed(2)}%` },
                ]);
            },
        },
        z: 2,
    });

    if (showStatisticalMarkers) {
        series.push(
            ...createHistogramStatLines(
                stats,
                maxPercentage * 1.05,
                trace.name,
                color,
                axisIndex,
                showStatisticalLabels,
            ),
        );
    }

    if (showRealizationPoints) {
        series.push({
            type: "scatter",
            name: trace.name,
            data: trace.values.map((value, index) => ({
                value: [value, -2],
                realizationId: trace.realizationIds?.[index] ?? index,
            })),
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            symbol: "rect",
            symbolSize: [1.5, 10],
            itemStyle: { color, opacity: 0.6 },
            tooltip: {
                formatter: (params: any) => {
                    const value = Array.isArray(params.value) ? params.value[0] : params.value;
                    const realizationId = params.data?.realizationId ?? params.dataIndex;
                    return formatCompactTooltip(trace.name, [
                        { label: "Value", value: formatNumber(value) },
                        { label: "Realization", value: String(realizationId) },
                    ]);
                },
            },
            z: 3,
        });
    }

    return series;
}

function createHistogramStatLines(
    stats: PointStatistics,
    maxPct: number,
    traceName: string,
    color: string,
    axisIndex: number,
    showLabels = false,
): any[] {
    function makeLine(value: number, label: string, dash: string): any {
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
            tooltip: {
                formatter: formatCompactTooltip(traceName, [{ label, value: formatNumber(value), color }]),
            },
            label: showLabels
                ? {
                      show: true,
                      position: "end",
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
