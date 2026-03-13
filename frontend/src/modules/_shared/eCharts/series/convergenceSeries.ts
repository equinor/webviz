import { formatRgb, parse } from "culori";
import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { DistributionTrace } from "../types";

export type ConvergenceChartSeries = LineSeriesOption | CustomSeriesOption;

type ConvergenceStatisticKey = "p90" | "mean" | "p10";

const CONVERGENCE_SERIES_ID_PREFIX = "convergence";

export function buildConvergenceSeries(trace: DistributionTrace, axisIndex = 0): ConvergenceChartSeries[] {
    if (!trace.realizationIds || trace.values.length === 0) return [];

    const pairs = trace.realizationIds.map((realId, i) => ({
        realization: realId,
        value: trace.values[i],
    }));
    pairs.sort((a, b) => a.realization - b.realization);

    const convergence = calcConvergence(pairs);
    let lightColor = trace.color;
    const rgbColor = parse(trace.color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    return [
        createConvergenceLineSeries(trace, convergence, "p90", axisIndex),
        createConvergenceLineSeries(trace, convergence, "mean", axisIndex),
        createConvergenceLineSeries(trace, convergence, "p10", axisIndex),
        createConvergenceBandSeries(trace, convergence, lightColor, axisIndex),
    ];
}

export function formatConvergenceStatLabel(statKey: string): string {
    switch (statKey) {
        case "p90":
            return "P90";
        case "p10":
            return "P10";
        case "mean":
            return "Mean";
        default:
            return statKey;
    }
}

export function getConvergenceSeriesStatKey(seriesId: string | undefined): ConvergenceStatisticKey | null {
    if (!seriesId?.startsWith(`${CONVERGENCE_SERIES_ID_PREFIX}:`)) return null;
    const parts = seriesId.split(":");
    const statKey = parts[2];
    if (statKey === "p90" || statKey === "mean" || statKey === "p10") return statKey;
    return null;
}

function createConvergenceBandSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    fillColor: string,
    axisIndex: number,
): CustomSeriesOption {
    return {
        id: `${CONVERGENCE_SERIES_ID_PREFIX}:${trace.name}:band:${axisIndex}`,
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
    };
}

function createConvergenceLineSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    statKey: ConvergenceStatisticKey,
    axisIndex: number,
): LineSeriesOption {
    return {
        id: `${CONVERGENCE_SERIES_ID_PREFIX}:${trace.name}:${statKey}:${axisIndex}`,
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
    };
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

type ConvergencePoint = { realization: number; mean: number; p10: number; p90: number };

function calcConvergence(pairs: { realization: number; value: number }[]): ConvergencePoint[] {
    const growing: number[] = [];
    const result: ConvergencePoint[] = [];
    let sum = 0;

    for (const [i, pair] of pairs.entries()) {
        growing.push(pair.value);
        sum += pair.value;
        result.push({
            realization: pair.realization,
            mean: sum / (i + 1),
            p10: computeReservesP10(growing),
            p90: computeReservesP90(growing),
        });
    }

    return result;
}
