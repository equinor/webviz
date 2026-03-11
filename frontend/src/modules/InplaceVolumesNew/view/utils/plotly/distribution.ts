import type { Dash, PlotData } from "plotly.js";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { computeStatistics } from "../statistics";

// Explicit width for violin traces. With side="positive" and scalemode="width" (default),
// the violin's peak extends to VIOLIN_WIDTH / 2 from the baseline (y0).
const VIOLIN_WIDTH = 0.5;
const VIOLIN_PEAK_HEIGHT = VIOLIN_WIDTH / 2;

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
        width: VIOLIN_WIDTH,
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
        data.push(...createStatisticLinesForDistribution(values, title, color, resultName, showStatisticalLabels));
    }

    return data;
}

/**
 * Creates vertical lines for P10, Mean, and P90 on distribution plots.
 * Line height is derived from the explicit VIOLIN_WIDTH so lines match the violin peak.
 */
function createStatisticLinesForDistribution(
    values: number[],
    title: string,
    color: string,
    resultName: string,
    showLabels: boolean,
): Partial<PlotData>[] {
    const stats = computeStatistics(values);
    const { p10, p90, mean } = stats;

    // Extend lines slightly above the violin peak so they're clearly visible
    const lineHeight = VIOLIN_PEAK_HEIGHT * 1.1;

    function createLine(value: number, label: string, dash: Dash): Partial<PlotData> {
        const trace: Partial<PlotData> = {
            x: [value, value],
            y: [0, lineHeight],
            type: "scatter" as const,
            mode: showLabels ? "text+lines" : "lines",
            line: { color, width: 2, dash },
            showlegend: false,
            name: label,
            legendgroup: title,
            hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatNumber(value)}<extra></extra>`,
        };

        if (showLabels) {
            trace.text = ["", `${label}: ${formatNumber(value)}`];
            trace.textposition = "top center";
            trace.textfont = { color: "black", size: 11 };
        }

        return trace;
    }

    return [createLine(p10, "P10", "dash"), createLine(mean, "Mean", "solid"), createLine(p90, "P90", "dash")];
}
