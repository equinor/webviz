import type { CustomSeriesOption, ScatterSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { DistributionTrace } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type PercentileRangeCenterStatistic = "mean" | "p50";

export type PercentileRangeDisplayOptions = {
    showRealizationPoints?: boolean;
    yAxisPosition?: number;
    centerStatistic?: PercentileRangeCenterStatistic;
    showWhiskers?: boolean;
};

export function buildPercentileRangeSeries(
    trace: DistributionTrace,
    options: PercentileRangeDisplayOptions = {},
    axisIndex = 0,
): Array<CustomSeriesOption | ScatterSeriesOption> {
    const { showRealizationPoints = false, yAxisPosition = 0, centerStatistic = "p50", showWhiskers = true } = options;

    if (trace.values.length === 0) return [];

    const stats = computePointStatistics(trace.values);
    const centerValue = centerStatistic === "mean" ? stats.mean : stats.p50;

    const series: Array<CustomSeriesOption | ScatterSeriesOption> = [];

    series.push(
        createPercentileRangeGlyphSeries(
            trace,
            stats,
            centerValue,
            centerStatistic,
            showWhiskers,
            yAxisPosition,
            axisIndex,
        ),
    );

    if (showRealizationPoints) {
        series.push(createRealizationPointSeries(trace, yAxisPosition, axisIndex));
    }

    return series;
}

function createPercentileRangeGlyphSeries(
    trace: DistributionTrace,
    stats: ReturnType<typeof computePointStatistics>,
    centerValue: number,
    centerStatistic: PercentileRangeCenterStatistic,
    showWhiskers: boolean,
    yAxisPosition: number,
    axisIndex: number,
): CustomSeriesOption {
    const centerLabel = centerStatistic === "mean" ? "Mean" : "P50";

    return {
        type: "custom",
        name: trace.name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        itemStyle: { color: trace.color, borderColor: trace.color },
        data: [[yAxisPosition, stats.min, stats.p90, centerValue, stats.p10, stats.max]],
        encode: { x: [1, 2, 3, 4, 5], y: 0 },
        z: 2,
        renderItem: (_params, api) => {
            const yPosition = Number(api.value(0));
            const min = Number(api.value(1));
            const p90 = Number(api.value(2));
            const center = Number(api.value(3));
            const p10 = Number(api.value(4));
            const max = Number(api.value(5));

            const centerPoint = api.coord([center, yPosition]);
            const minPoint = api.coord([min, yPosition]);
            const p90Point = api.coord([p90, yPosition]);
            const centerValuePoint = api.coord([center, yPosition]);
            const p10Point = api.coord([p10, yPosition]);
            const maxPoint = api.coord([max, yPosition]);

            const bandSize = api.size?.([0, 1]);
            const bandHeight = Math.max(
                Array.isArray(bandSize) ? Number(bandSize[1] ?? bandSize[0] ?? 0) : Number(bandSize ?? 0),
                16,
            );
            const boxHalfHeight = Math.min(Math.max(bandHeight * 0.25, 8), 18);
            const capHalfHeight = boxHalfHeight * 0.8;

            const whiskerElements = showWhiskers
                ? [
                      {
                          type: "line" as const,
                          shape: { x1: minPoint[0], y1: centerPoint[1], x2: p90Point[0], y2: centerPoint[1] },
                          style: { stroke: trace.color, lineWidth: 2 },
                      },
                      {
                          type: "line" as const,
                          shape: { x1: p10Point[0], y1: centerPoint[1], x2: maxPoint[0], y2: centerPoint[1] },
                          style: { stroke: trace.color, lineWidth: 2 },
                      },
                      {
                          type: "line" as const,
                          shape: {
                              x1: minPoint[0],
                              y1: centerPoint[1] - capHalfHeight,
                              x2: minPoint[0],
                              y2: centerPoint[1] + capHalfHeight,
                          },
                          style: { stroke: trace.color, lineWidth: 2 },
                      },
                      {
                          type: "line" as const,
                          shape: {
                              x1: maxPoint[0],
                              y1: centerPoint[1] - capHalfHeight,
                              x2: maxPoint[0],
                              y2: centerPoint[1] + capHalfHeight,
                          },
                          style: { stroke: trace.color, lineWidth: 2 },
                      },
                  ]
                : [];

            return {
                type: "group",
                children: [
                    ...whiskerElements,
                    {
                        type: "rect",
                        shape: {
                            x: p90Point[0],
                            y: centerPoint[1] - boxHalfHeight,
                            width: Math.max(p10Point[0] - p90Point[0], 1),
                            height: boxHalfHeight * 2,
                        },
                        style: {
                            fill: trace.color,
                            opacity: 0.22,
                            stroke: trace.color,
                            lineWidth: 2,
                        },
                    },
                    {
                        type: "line",
                        shape: {
                            x1: centerValuePoint[0],
                            y1: centerPoint[1] - boxHalfHeight,
                            x2: centerValuePoint[0],
                            y2: centerPoint[1] + boxHalfHeight,
                        },
                        style: { stroke: trace.color, lineWidth: 2.5 },
                    },
                ],
            };
        },
        tooltip: {
            formatter: () =>
                formatCompactTooltip(trace.name, [
                    { label: "Min", value: formatNumber(stats.min), color: trace.color },
                    { label: "P90", value: formatNumber(stats.p90), color: trace.color },
                    { label: centerLabel, value: formatNumber(centerValue), color: trace.color },
                    { label: "P10", value: formatNumber(stats.p10), color: trace.color },
                    { label: "Max", value: formatNumber(stats.max), color: trace.color },
                    ...(centerStatistic === "p50"
                        ? [{ label: "Mean", value: formatNumber(stats.mean), color: trace.color }]
                        : [{ label: "P50", value: formatNumber(stats.p50), color: trace.color }]),
                ]),
        },
    };
}

function createRealizationPointSeries(
    trace: DistributionTrace,
    yAxisPosition: number,
    axisIndex: number,
): ScatterSeriesOption {
    return {
        type: "scatter",
        name: `${trace.name} points`,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: trace.values.map((value, index) => ({
            value: [value, yAxisPosition],
            realizationId: trace.realizationIds?.[index] ?? index,
        })),
        symbol: "circle",
        symbolSize: 4,
        itemStyle: { color: trace.color, opacity: 0.45 },
        z: 3,
        tooltip: {
            formatter: (params: CallbackDataParams) => {
                const value = Array.isArray(params.value) ? Number(params.value[0]) : Number(params.value);
                const realizationId =
                    params.data && typeof params.data === "object" && "realizationId" in params.data
                        ? Number((params.data as { realizationId?: number }).realizationId ?? params.dataIndex)
                        : params.dataIndex;

                return formatCompactTooltip(trace.name, [
                    { label: "Value", value: formatNumber(value), color: trace.color },
                    { label: "Realization", value: String(realizationId), color: trace.color },
                ]);
            },
        },
    };
}
