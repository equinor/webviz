import { formatRgb, parse } from "culori";
import type { PlotData } from "plotly.js";

import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

export type PlotlyConvergenceTracesOptions = {
    title: string;
    realValues: number[];
    resultValues: number[];
    color: string;
};
export function makePlotlyConvergenceTraces({
    title,
    realValues,
    resultValues,
    color,
}: PlotlyConvergenceTracesOptions): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    // Build realization array
    const realizationAndResultArray: RealizationAndResult[] = realValues.map((real, i) => ({
        realization: real,
        resultValue: resultValues[i],
    }));

    const convergenceArr = calcConvergenceArray(realizationAndResultArray);

    // Create light color for fill
    let lightColor = color;
    const rgbColor = parse(color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    data.push(
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p90),
            name: "P90",
            type: "scatter",
            showlegend: false,
            line: { color, width: 1, dash: "dashdot" },
            mode: "lines",
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>P90: ${formatNumber(Number(p.p90))}<extra></extra>`,
            ),
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.mean),
            name: title,
            type: "scatter",
            showlegend: true,
            line: { color, width: 1 },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>Mean: ${formatNumber(Number(p.mean))}<extra></extra>`,
            ),
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p10),
            name: "P10",
            type: "scatter",
            showlegend: false,
            line: { color, width: 1, dash: "dash" },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>P10: ${formatNumber(Number(p.p10))}<extra></extra>`,
            ),
        },
    );

    return data;
}
export type RealizationAndResult = {
    realization: number;
    resultValue: number;
};

export type ConvergenceResult = {
    realization: number;
    mean: number;
    p10: number;
    p90: number;
};

export function calcConvergenceArray(realizationAndResultArray: RealizationAndResult[]): ConvergenceResult[] {
    const sortedArray = realizationAndResultArray.sort((a, b) => a.realization - b.realization);
    const growingDataArray: number[] = [];
    const convergenceArray: ConvergenceResult[] = [];
    let sum = 0;
    for (const [index, realizationAndResult] of sortedArray.entries()) {
        growingDataArray.push(realizationAndResult.resultValue);
        sum += realizationAndResult.resultValue;
        const mean = sum / (index + 1);

        const p10 = computeReservesP10(growingDataArray);
        const p90 = computeReservesP90(growingDataArray);

        convergenceArray.push({
            realization: realizationAndResult.realization,
            mean,
            p10,
            p90,
        });
    }

    return convergenceArray;
}
