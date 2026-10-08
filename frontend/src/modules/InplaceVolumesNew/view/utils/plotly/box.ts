import type { PlotData } from "plotly.js";

import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import { computeStatistics } from "@modules/_shared/utils/math/statistics";

export type PlotlyBoxPlotTracesOptions = {
    title: string;
    values: number[];
    realizations: number[];
    resultName: string;
    color: string;
    yAxisPosition?: number;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
};
export function makePlotlyBoxPlotTraces(options: PlotlyBoxPlotTracesOptions): Partial<PlotData>[] {
    const {
        title,
        values,
        realizations,
        resultName,
        color,
        yAxisPosition,
        showStatisticalMarkers,
        showRealizationPoints,
    } = options;
    const data: Partial<PlotData>[] = [];

    data.push({
        x: values,
        name: title,
        type: "box",
        marker: { color },
        y0: yAxisPosition ?? 0,
        // Plotly ignores hovertemplate on the box statistics, so use hoverinfo; points get their realization as text.
        // @ts-expect-error - box hoveron values are missing in the plotly types
        hoveron: "boxes+points",
        boxpoints: showRealizationPoints ? "all" : "outliers",
        text: realizations.map((realization) => `Realization: ${realization}`),
        // @ts-expect-error - this hoverinfo combination is missing in the plotly types
        hoverinfo: "x+text+name",
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
        hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatInplaceVolumesValue(value)}<extra></extra>`,
    });

    return [createMarker(p10, "P10"), createMarker(mean, "Mean"), createMarker(p90, "P90")];
}
