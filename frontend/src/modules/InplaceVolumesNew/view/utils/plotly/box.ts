import type { PlotData } from "plotly.js";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { computeStatistics } from "../statistics";

export type PlotlyBoxPlotTracesOptions = {
    title: string;
    values: number[];
    resultName: string;
    color: string;
    yAxisPosition?: number;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
};
export function makePlotlyBoxPlotTraces(options: PlotlyBoxPlotTracesOptions): Partial<PlotData>[] {
    const { title, values, resultName, color, yAxisPosition, showStatisticalMarkers, showRealizationPoints } = options;
    const data: Partial<PlotData>[] = [];

    data.push({
        x: values,
        name: title,
        legendgroup: title,
        type: "box",
        marker: { color },
        // @ts-expect-error - missing arguments in the plotly types
        y0: yAxisPosition ?? 0,
        hoverinfo: "skip",
        boxpoints: showRealizationPoints ? "all" : "outliers",
        hovertemplate: `${title}<br>${resultName}: <b>%{x}</b> <br>Realization: <b>%{pointNumber}</b> <extra></extra>`,
    });

    if (showStatisticalMarkers) {
        data.push(...createQuantileAndMeanMarkerTracesForBoxPlot(title, resultName, values, yAxisPosition ?? 0, color));
    }

    return data;
}

function createQuantileAndMeanMarkerTracesForBoxPlot(
    title: string,
    resultName: string,
    values: number[],
    yPosition: number,
    ensembleColor: string | undefined,
): Partial<PlotData>[] {
    const stats = computeStatistics(values);
    const { p10, p90, mean } = stats;

    const createMarker = (value: number, label: string) => ({
        x: [value],
        y: [yPosition],
        type: "scatter" as const,
        hoverinfo: "x+text" as const,
        hovertext: label,
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatNumber(value)}<extra></extra>`,
    });

    return [createMarker(p10, "P10"), createMarker(mean, "Mean"), createMarker(p90, "P90")];
}
