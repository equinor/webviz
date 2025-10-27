import type { PlotData } from "plotly.js";

export type PlotlyDensityTracesOptions = {
    title: string;
    values: number[];
    color: string;
    showRealizationPoints: boolean;
};
export function makePlotlyDensityTraces({
    title,
    values,
    color,
    showRealizationPoints,
}: PlotlyDensityTracesOptions): Partial<PlotData>[] {
    return [
        {
            x: values,
            name: title,
            legendgroup: title,
            type: "violin",
            marker: { color },
            side: "positive",
            y0: 0,
            orientation: "h",
            spanmode: "hard",
            meanline: { visible: true },
            hovertemplate: `<b>%{x}</b> <br>Realization: <b>%{pointNumber}</b> <extra></extra>`,
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
            hoverinfo: "x",
            // @ts-expect-error - arguments in the plotly types
            hoveron: "points+kde",
            points: showRealizationPoints ? "all" : false,
            pointpos: -0.3,
        },
    ];
}
