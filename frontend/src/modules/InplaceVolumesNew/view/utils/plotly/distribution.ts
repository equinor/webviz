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
            hovertemplate: `<b>${title}</b><br>Value: %{x}<br>Realization: %{pointNumber}<extra></extra>`,
            hoverinfo: "x",
            // @ts-expect-error - arguments in the plotly types
            hoveron: "points+kde",
            points: showRealizationPoints ? "all" : false,
            pointpos: -0.3,
            jitter: 0.1,
        },
    ];
}
