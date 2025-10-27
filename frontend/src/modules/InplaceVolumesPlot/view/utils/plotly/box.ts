import type { PlotData } from "plotly.js";

import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

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
        hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
    });

    if (showStatisticalMarkers) {
        data.push(...createQuantileAndMeanMarkerTracesForBoxPlot(title, resultName, values, yAxisPosition ?? 0, color));
    }

    return data;
}

export function createQuantileAndMeanMarkerTracesForBoxPlot(
    title: string,
    resultName: string,
    values: number[],
    yPosition: number,
    ensembleColor: string | undefined,
): Partial<PlotData>[] {
    const p90 = computeReservesP90(values);
    const p10 = computeReservesP10(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const createMarker = (value: number, label: string) => ({
        x: [value],
        y: [yPosition],
        type: "scatter" as const,
        hoverinfo: "x+text" as const,
        hovertext: label,
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatNumber(value)}<extra></extra>`,
        hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
    });

    return [createMarker(p10, "P10"), createMarker(mean, "Mean"), createMarker(p90, "P90")];
}
