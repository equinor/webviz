import { formatRgb, parse } from "culori";
import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { DistributionTrace } from "../../types";
import type { ConvergencePoint } from "../../utils/convergence";
import { calcConvergence } from "../../utils/convergence";
import type { ConvergenceStatisticKey } from "./builder";
import { withSeriesMetadata, type SeriesMetadata } from "../../utils/seriesMetadata";

import { makeConvergenceSeriesId } from "./ids";

export type ConvergenceChartSeries = LineSeriesOption | CustomSeriesOption;

export function buildConvergenceSeries(trace: DistributionTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.realizationIds || trace.values.length === 0) return { series: [], legendData: [] };

    const pairs = trace.realizationIds.map((realId, index) => ({
        realization: realId,
        value: trace.values[index],
    }));
    pairs.sort((a, b) => a.realization - b.realization);

    const convergence = calcConvergence(pairs);
    let lightColor = trace.color;
    const rgbColor = parse(trace.color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    const series: ConvergenceChartSeries[] = [
        createConvergenceLineSeries(trace, convergence, "p90", axisIndex),
        createConvergenceLineSeries(trace, convergence, "mean", axisIndex),
        createConvergenceLineSeries(trace, convergence, "p10", axisIndex),
        createConvergenceBandSeries(trace, convergence, lightColor, axisIndex),
    ];

    return {
        series,
        legendData: series.length > 0 ? [trace.name] : [],
    };
}

function createConvergenceBandSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    fillColor: string,
    axisIndex: number,
): CustomSeriesOption {
    return withSeriesMetadata(
        {
            id: makeConvergenceSeriesId(trace.name, "band", axisIndex),
            type: "custom",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            itemStyle: { color: trace.color },
            data: convergence.map((point) => [point.realization, point.p90, point.p10]),
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
                    const point = convergence[startIndex + index];
                    points.push(api.coord([point.realization, point.p90]));
                }

                for (let index = count - 1; index >= 0; index--) {
                    const point = convergence[startIndex + index];
                    points.push(api.coord([point.realization, point.p10]));
                }

                return {
                    type: "polygon",
                    shape: { points },
                    style: { fill: fillColor, opacity: 1 },
                };
            },
        },
        createConvergenceBandMetadata(axisIndex),
    );
}

function createConvergenceLineSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    statKey: ConvergenceStatisticKey,
    axisIndex: number,
): LineSeriesOption {
    return withSeriesMetadata(
        {
            id: makeConvergenceSeriesId(trace.name, statKey, axisIndex),
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: convergence.map((point) => [point.realization, point[statKey]]),
            itemStyle: { color: trace.color },
            lineStyle: buildConvergenceLineStyle(trace.color, statKey),
            symbol: "none",
            showSymbol: false,
            z: statKey === "mean" ? 3 : 2,
            emphasis: { disabled: true },
            tooltip: {
                valueFormatter: (value) => formatNumber(Number(value)),
            },
        },
        createConvergenceSummaryMetadata(axisIndex, statKey),
    );
}

function buildConvergenceLineStyle(color: string, statKey: ConvergenceStatisticKey): LineSeriesOption["lineStyle"] {
    switch (statKey) {
        case "p90":
            return { color, width: 1, type: [8, 4, 2, 4] };
        case "p10":
            return { color, width: 1, type: "dashed" };
        default:
            return { color, width: 1 };
    }
}

function createConvergenceSummaryMetadata(axisIndex: number, statKey: ConvergenceStatisticKey): SeriesMetadata {
    return {
        chart: "convergence",
        axisIndex,
        roles: ["summary"],
        statKey,
    };
}

function createConvergenceBandMetadata(axisIndex: number): SeriesMetadata {
    return {
        chart: "convergence",
        axisIndex,
        roles: ["band"],
    };
}