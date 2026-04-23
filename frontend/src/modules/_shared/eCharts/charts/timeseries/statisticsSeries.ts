import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { StatisticKey, TimeseriesTrace } from "../../types";

import { makeTimeseriesBandSeriesId, makeTimeseriesStatisticSeriesId } from "./ids";
import { makeSteppedCategoryCoords, mapLineShapeToStep } from "./lineShape";

type StatSeriesEntry = {
    key: StatisticKey;
    width: number;
    dash: "solid" | "dashed" | "dotted";
};

export const STAT_SERIES_DEFS: StatSeriesEntry[] = [
    { key: "mean", width: 2, dash: "solid" },
    { key: "p50", width: 1.5, dash: "dashed" },
    { key: "p10", width: 1.5, dash: "dashed" },
    { key: "p90", width: 1.5, dash: "dashed" },
    { key: "min", width: 1.5, dash: "dotted" },
    { key: "max", width: 1.5, dash: "dotted" },
];

export function getOrderedStatisticKeys(selectedStatistics: StatisticKey[]): StatisticKey[] {
    return STAT_SERIES_DEFS.filter((definition) => selectedStatistics.includes(definition.key)).map(
        (definition) => definition.key,
    );
}

export function formatStatisticLabel(statKey: StatisticKey): string {
    switch (statKey) {
        case "mean":
            return "Mean";
        case "min":
            return "Min";
        case "max":
            return "Max";
        default:
            return statKey.toUpperCase();
    }
}

export function buildStatisticsSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): SeriesBuildResult {
    if (!trace.statistics) return { series: [], legendData: [] };

    const series: LineSeriesOption[] = [];
    const step = mapLineShapeToStep(trace.lineShape);

    for (const def of STAT_SERIES_DEFS) {
        if (selectedStatistics.includes(def.key)) {
            series.push({
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
                ...(step ? { step } : {}),
            });
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
    seriesId: string,
    step: "start" | "end" | null,
): CustomSeriesOption {
    return {
        type: "custom",
        id: seriesId,
        name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        clip: true,
        data: upperValues.map((upperValue, index) => [index, lowerValues[index], upperValue]),
        encode: { x: 0, y: [1, 2] },
        tooltip: { show: false },
        silent: true,
        z: 1,
        renderItem: createBandRenderItem(upperValues, lowerValues, fillColor, fillOpacity, step),
    };
}

function createBandRenderItem(
    upperValues: number[],
    lowerValues: number[],
    fillColor: string,
    fillOpacity: number,
    step: "start" | "end" | null,
): CustomSeriesOption["renderItem"] {
    const upperCoords = makeSteppedCategoryCoords(upperValues, step);
    const lowerCoords = makeSteppedCategoryCoords(lowerValues, step);
    return function renderStatisticsBand(params, api) {
        const bandParams = params as typeof params & {
            dataIndexInside?: number;
        };

        if (bandParams.dataIndexInside !== 0) {
            return { type: "group", children: [] };
        }

        const points: number[][] = [];
        for (let index = 0; index < upperCoords.length; index++) {
            points.push(api.coord(upperCoords[index]));
        }
        for (let index = lowerCoords.length - 1; index >= 0; index--) {
            points.push(api.coord(lowerCoords[index]));
        }

        return {
            type: "polygon",
            shape: { points },
            style: { fill: fillColor, opacity: fillOpacity },
        };
    };
}

export function buildFanchartSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): SeriesBuildResult {
    if (!trace.statistics) return { series: [], legendData: [] };

    const { p10, p90, min, max } = trace.statistics;
    const series: CustomSeriesOption[] = [];
    const step = mapLineShapeToStep(trace.lineShape);

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
                makeTimeseriesBandSeriesId(trace.name, "low", axisIndex),
                step,
            ),
            createBandSeries(
                p90,
                p10,
                trace.color,
                0.3,
                `${trace.name} _fan_mid`,
                axisIndex,
                makeTimeseriesBandSeriesId(trace.name, "mid", axisIndex),
                step,
            ),
            createBandSeries(
                max,
                p90,
                trace.color,
                0.08,
                `${trace.name} _fan_high`,
                axisIndex,
                makeTimeseriesBandSeriesId(trace.name, "high", axisIndex),
                step,
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
                makeTimeseriesBandSeriesId(trace.name, "band", axisIndex),
                step,
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
                makeTimeseriesBandSeriesId(trace.name, "band", axisIndex),
                step,
            ),
        );
    }

    return {
        series,
        legendData: [],
    };
}