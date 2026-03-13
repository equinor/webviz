import { formatRgb, parse } from "culori";

import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import type { DistributionTrace } from "../types";

export function buildConvergenceSeries(trace: DistributionTrace, axisIndex = 0): any[] {
    if (!trace.realizationIds || trace.values.length === 0) return [];

    const pairs = trace.realizationIds.map((realId, i) => ({
        realization: realId,
        value: trace.values[i],
    }));
    pairs.sort((a, b) => a.realization - b.realization);

    const convergence = calcConvergence(pairs);
    const xData = convergence.map((c) => c.realization);

    let lightColor = trace.color;
    const rgbColor = parse(trace.color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    return [
        {
            type: "line",
            name: "P90",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: xData.map((x, i) => [x, convergence[i].p90]),
            lineStyle: { color: trace.color, width: 1, type: "dashdot" },
            symbol: "none",
            showlegend: false,
        },
        {
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: xData.map((x, i) => [x, convergence[i].mean]),
            lineStyle: { color: trace.color, width: 1 },
            areaStyle: { color: lightColor },
            symbol: "none",
        },
        {
            type: "line",
            name: "P10",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: xData.map((x, i) => [x, convergence[i].p10]),
            lineStyle: { color: trace.color, width: 1, type: "dashed" },
            areaStyle: { color: lightColor },
            symbol: "none",
            showlegend: false,
        },
    ];
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
