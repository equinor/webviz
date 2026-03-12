import type { PlotData } from "plotly.js";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { computeStatistics } from "../statistics";

export type PlotlyDensityTracesOptions = {
    title: string;
    values: number[];
    color: string;
    resultName: string;
    showRealizationPoints: boolean;
    showStatisticalMarkers: boolean;
    showStatisticalLabels: boolean;
};
export function makePlotlyDensityTraces({
    title,
    values,
    color,
    resultName,
    showRealizationPoints,
    showStatisticalMarkers,
    showStatisticalLabels,
}: PlotlyDensityTracesOptions): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    data.push({
        x: values,
        name: title,
        legendgroup: title,
        type: "violin",
        marker: { color },
        side: "positive",
        y0: 0,
        orientation: "h",
        spanmode: "hard",
        meanline: { visible: !showStatisticalMarkers },
        hovertemplate: `<b>${title}</b><br>Value: %{x}<br>Realization: %{pointNumber}<extra></extra>`,
        hoverinfo: "x",
        // @ts-expect-error - arguments in the plotly types
        hoveron: "points+kde",
        points: showRealizationPoints ? "all" : false,
        pointpos: -0.3,
        jitter: 0.1,
    });

    if (showStatisticalMarkers) {
        data.push(createStatisticMarkersForDistribution(values, title, color, resultName, showStatisticalLabels));
    }

    return data;
}

/**
 * Creates diamond markers at y≈0 for P10, Mean, and P90 on distribution plots.
 */
function createStatisticMarkersForDistribution(
    values: number[],
    title: string,
    color: string,
    resultName: string,
    showLabels: boolean,
): Partial<PlotData> {
    const stats = computeStatistics(values);
    const { p10, p90, mean } = stats;

    const xValues = [p10, mean, p90];
    const labels = ["P10", "Mean", "P90"];
    const yValues = [0, 0, 0];
    const symbols = ["diamond", "diamond", "diamond"];

    return {
        x: xValues,
        y: yValues,
        type: "scatter" as const,
        mode: showLabels ? "text+markers" : "markers",
        marker: { color, size: 10, symbol: symbols },
        showlegend: false,
        legendgroup: title,
        text: labels.map((label, i) => `${label}: ${formatNumber(xValues[i])}`),
        textposition: "top center",
        textfont: showLabels ? { color: "black", size: 11 } : undefined,
        hovertemplate: xValues.map(
            (_, i) =>
                `<b>${title}</b><br><b>${labels[i]}</b><br>${resultName}: ${formatNumber(xValues[i])}<extra></extra>`,
        ),
    };
}
