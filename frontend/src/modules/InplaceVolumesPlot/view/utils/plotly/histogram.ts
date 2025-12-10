import type { Dash, PlotData } from "plotly.js";

import { makeHistogramTrace } from "@modules/_shared/histogram";
import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

export type PlotlyHistogramTracesOptions = {
    title: string;
    values: number[];
    resultName: string;
    color: string;
    numBins: number;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    showStatisticalLabels: boolean;
    showPercentageInBar: boolean;
};
export function makePlotlyHistogramTraces({
    title,
    values,
    resultName,
    color,
    numBins,
    showStatisticalMarkers,
    showRealizationPoints,
    showStatisticalLabels,
    showPercentageInBar,
}: PlotlyHistogramTracesOptions): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const histogram = makeHistogramTrace({
        xValues: values,
        numBins: numBins,
        color,
        showPercentageInBar,
        opacity: showStatisticalMarkers ? 0.6 : 1,
    });

    histogram.name = title;
    histogram.legendgroup = title;
    histogram.showlegend = true;

    if (showStatisticalMarkers) {
        const statisticLines = createStatisticLinesForHistogram(
            values,
            title,
            color,
            numBins,
            resultName,
            showStatisticalLabels,
        );
        data.push(...statisticLines);
    }
    data.push(histogram);
    if (showRealizationPoints) {
        const rugTrace = createRugTraceForHistogram(values, title, color);
        data.push(rugTrace);
    }

    return data;
}

/**
 * Creates vertical lines for P10, Mean, and P90 on histogram plots
 */
function createStatisticLinesForHistogram(
    xValues: number[],
    title: string,
    color: string,
    numBins: number,
    resultName: string,
    showLabels: boolean,
): Partial<PlotData>[] {
    const p90 = computeReservesP90(xValues);
    const p10 = computeReservesP10(xValues);
    const mean = xValues.reduce((a, b) => a + b, 0) / xValues.length;

    // Calculate histogram bins to find max percentage
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const range = xMax - xMin;
    const binSize = range / numBins;

    const binCounts = new Array(numBins).fill(0);
    xValues.forEach((value) => {
        const binIndex = Math.min(Math.floor((value - xMin) / binSize), numBins - 1);
        binCounts[binIndex]++;
    });

    const totalCount = xValues.length;
    const binPercentages = binCounts.map((count) => (count / totalCount) * 100);
    const maxPercentage = Math.max(...binPercentages);
    const lineHeight = maxPercentage * 1.05;

    function createLine(value: number, label: string, dash: Dash): Partial<PlotData> {
        const trace: Partial<PlotData> = {
            x: [value, value],
            y: [0, lineHeight],
            type: "scatter" as const,
            mode: showLabels ? "text+lines" : "lines",
            line: { color, width: 4, dash },
            showlegend: false,
            name: label,
            legendgroup: title,
            hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${value ? formatNumber(value) : ""}<extra></extra>`,
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
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
/**
 * Creates a rug trace showing individual realization points
 */
function createRugTraceForHistogram(xValues: number[], title: string, color: string): Partial<PlotData> {
    return {
        x: xValues,
        y: new Array(xValues.length).fill(-2),
        type: "scatter",
        mode: "markers",
        marker: {
            color,
            symbol: "line-ns-open",
            line: { width: 1, color },
            size: 10,
            opacity: 0.6,
        },
        showlegend: false,
        name: "Realizations",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br>Value: %{x}<br>Realization: %{pointNumber}<extra></extra>`,
        hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
    };
}
