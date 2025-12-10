import type { PlotData } from "plotly.js";

export type PlotlyScatterTracesOptions = {
    title: string;
    xValues: number[];
    yValues: number[];
    realizations: string[];
    color: string;
    xAxisLabel: string;
    yAxisLabel: string;
};
export function makePlotlyScatterTraces({
    title,
    xValues,
    yValues,
    realizations,
    color,
    xAxisLabel,
    yAxisLabel,
}: PlotlyScatterTracesOptions): Partial<PlotData>[] {
    const markerColor = `${color}80`;
    const lineColor = `${color}FF`;
    return [
        {
            x: xValues,
            y: yValues,
            name: title,
            text: realizations,
            legendgroup: title,
            mode: "markers",
            marker: {
                symbol: "circle",
                size: 10,
                color: markerColor,
                opacity: 1,
                line: {
                    color: lineColor,
                    width: 1,
                },
            },
            type: "scatter",
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
            hovertemplate: `${xAxisLabel} = <b>%{x}</b> <br>${yAxisLabel} = <b>%{y}</b> <br>Realization = <b>%{text}</b> <extra></extra>`,
        },
    ];
}
