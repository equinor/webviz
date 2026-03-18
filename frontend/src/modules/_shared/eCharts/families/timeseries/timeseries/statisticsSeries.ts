import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../../builders/composeChartOption";
import type { StatisticKey, TimeseriesTrace } from "../../../types";
import { withSeriesMetadata, type SeriesMetadata } from "../../../utils/seriesMetadata";

import { makeTimeseriesBandSeriesId, makeTimeseriesStatisticSeriesId } from "./ids";

type StatSeriesEntry = {
    key: StatisticKey;
    width: number;
    dash: "solid" | "dashed" | "dotted";
};

const STAT_SERIES_DEFS: StatSeriesEntry[] = [
    { key: "mean", width: 2, dash: "solid" },
    { key: "p50", width: 1.5, dash: "dashed" },
    { key: "p10", width: 1.5, dash: "dashed" },
    { key: "p90", width: 1.5, dash: "dashed" },
    { key: "min", width: 1.5, dash: "dotted" },
    { key: "max", width: 1.5, dash: "dotted" },
];

export function buildStatisticsSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): SeriesBuildResult {
    if (!trace.statistics) return { series: [], legendData: [] };

    const series: LineSeriesOption[] = [];

    for (const def of STAT_SERIES_DEFS) {
        if (selectedStatistics.includes(def.key)) {
            series.push(
                withSeriesMetadata(
                    {
                        id: makeTimeseriesStatisticSeriesId(trace.name, def.key, axisIndex),
                        name: trace.name,
                        type: "line",
                        data: trace.statistics[def.key],
                        xAxisIndex: axisIndex,
                        yAxisIndex: axisIndex,
                        itemStyle: { color: trace.color },
                        lineStyle: { color: trace.color, width: def.width, type: def.dash },
                        symbol: "none",
                        emphasis: { disabled: true },
                        blur: { lineStyle: { opacity: 1 } },
                    },
                    createTimeseriesSummaryMetadata(axisIndex, def.key),
                ),
            );
        }
    }

    return {
        series,
        legendData: series.length > 0 ? [trace.name] : [],
    };
}

function createBandSeries(
    upperValues: number[],
    lowerValues: number[],
    fillColor: string,
    fillOpacity: number,
    name: string,
    axisIndex: number,
    metadata: SeriesMetadata,
    seriesId?: string,
): CustomSeriesOption {
    return withSeriesMetadata(
        {
            type: "custom",
            ...(seriesId ? { id: seriesId } : {}),
            name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: upperValues.map((upperValue, index) => [index, lowerValues[index], upperValue]),
            encode: { x: 0, y: [1, 2] },
            tooltip: { show: false },
            silent: true,
            z: 1,
            renderItem(params, api) {
                const bandParams = params as typeof params & {
                    dataIndexInside?: number;
                    dataInsideLength?: number;
                    dataIndex?: number;
                };

                if (bandParams.dataIndexInside !== 0) {
                    return { type: "group", children: [] };
                }
                const count = bandParams.dataInsideLength ?? 0;
                const startIndex = bandParams.dataIndex ?? 0;
                if (count === 0) return { type: "group", children: [] };

                const points: number[][] = [];

                for (let index = 0; index < count; index++) {
                    points.push(api.coord([startIndex + index, upperValues[startIndex + index]]));
                }
                for (let index = count - 1; index >= 0; index--) {
                    points.push(api.coord([startIndex + index, lowerValues[startIndex + index]]));
                }

                return {
                    type: "polygon",
                    shape: { points },
                    style: { fill: fillColor, opacity: fillOpacity },
                };
            },
        },
        metadata,
    );
}

export function buildFanchartSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): SeriesBuildResult {
    if (!trace.statistics) return { series: [], legendData: [] };

    const { p10, p90, min, max } = trace.statistics;
    const series: CustomSeriesOption[] = [];

    const hasPercentiles = selectedStatistics.includes("p10") && selectedStatistics.includes("p90");
    const hasMinMax = selectedStatistics.includes("min") && selectedStatistics.includes("max");

    if (hasMinMax && hasPercentiles) {
        series.push(
            createBandSeries(
                p10,
                min,
                trace.color,
                0.08,
                `${trace.name} _fan_low`,
                axisIndex,
                createTimeseriesBandMetadata(axisIndex),
                makeTimeseriesBandSeriesId(trace.name, "low", axisIndex),
            ),
            createBandSeries(
                p90,
                p10,
                trace.color,
                0.3,
                `${trace.name} _fan_mid`,
                axisIndex,
                createTimeseriesBandMetadata(axisIndex),
                makeTimeseriesBandSeriesId(trace.name, "mid", axisIndex),
            ),
            createBandSeries(
                max,
                p90,
                trace.color,
                0.08,
                `${trace.name} _fan_high`,
                axisIndex,
                createTimeseriesBandMetadata(axisIndex),
                makeTimeseriesBandSeriesId(trace.name, "high", axisIndex),
            ),
        );
    } else if (hasMinMax) {
        series.push(
            createBandSeries(
                max,
                min,
                trace.color,
                0.1,
                `${trace.name} _fan_band`,
                axisIndex,
                createTimeseriesBandMetadata(axisIndex),
                makeTimeseriesBandSeriesId(trace.name, "band", axisIndex),
            ),
        );
    } else if (hasPercentiles) {
        series.push(
            createBandSeries(
                p90,
                p10,
                trace.color,
                0.3,
                `${trace.name} _fan_band`,
                axisIndex,
                createTimeseriesBandMetadata(axisIndex),
                makeTimeseriesBandSeriesId(trace.name, "band", axisIndex),
            ),
        );
    }

    return {
        series,
        legendData: [],
    };
}

function createTimeseriesSummaryMetadata(axisIndex: number, statKey: StatisticKey): SeriesMetadata {
    return {
        family: "timeseries",
        chart: "timeseries",
        axisIndex,
        roles: ["summary"],
        statKey,
    };
}

function createTimeseriesBandMetadata(axisIndex: number): SeriesMetadata {
    return {
        family: "timeseries",
        chart: "timeseries",
        axisIndex,
        roles: ["band"],
    };
}