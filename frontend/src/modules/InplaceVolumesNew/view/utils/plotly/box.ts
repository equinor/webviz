import type { BoxData, ScatterData } from "plotly.js";

import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import { computeStatistics } from "@modules/_shared/utils/math/statistics";

type BoxTrace = Partial<BoxData> & { type: "box" };
type MarkerTrace = Partial<ScatterData> & { type: "scatter" };

export type PlotlyBoxPlotTracesOptions = {
    title: string;
    values: number[];
    realizations: number[];
    resultName: string;
    color: string;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
};
/**
 * A horizontal box in the category row named `title`.
 */
export function makePlotlyBoxPlotTraces(options: PlotlyBoxPlotTracesOptions): (BoxTrace | MarkerTrace)[] {
    const { title, values, realizations, resultName, color, showStatisticalMarkers, showRealizationPoints } = options;
    const data: (BoxTrace | MarkerTrace)[] = [];

    data.push({
        x: values,
        y: values.map(() => title),
        name: title,
        type: "box",
        orientation: "h",
        marker: { color },
        // Plotly ignores hovertemplate on the box statistics, so use hoverinfo; points get their realization as text.
        hoveron: "boxes+points",
        boxpoints: showRealizationPoints ? "all" : false,
        text: realizations.map((realization) => `Realization: ${realization}`),
        hoverinfo: "x+text+name",
        // Plotly cuts the name tag at 15 characters by default; sensitivity case names are longer.
        hoverlabel: { namelength: -1 },
    });

    if (showStatisticalMarkers) {
        data.push(...createQuantileAndMeanMarkerTracesForBoxPlot(title, resultName, values, color));
    }

    return data;
}

function createQuantileAndMeanMarkerTracesForBoxPlot(
    title: string,
    resultName: string,
    values: number[],
    ensembleColor: string | undefined,
): MarkerTrace[] {
    const stats = computeStatistics(values);
    const { p10, p90, mean } = stats;

    const createMarker = (value: number, label: string): MarkerTrace => ({
        x: [value],
        y: [title],
        type: "scatter" as const,
        hoverinfo: "x+text" as const,
        hovertext: label,
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatInplaceVolumesValue(value)}<extra></extra>`,
    });

    return [createMarker(p10, "P10"), createMarker(mean, "Mean"), createMarker(p90, "P90")];
}
