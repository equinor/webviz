import type { PlotData } from "plotly.js";

export function makeScatterPlot(
    title: string,
    xValues: number[],
    yValues: number[],
    realizations: string[],
    color: string,
    xAxisLabel: string,
    yAxisLabel: string,
): Partial<PlotData>[] {
    return [
        {
            x: xValues,
            y: yValues,
            name: title,
            text: realizations,
            legendgroup: title,
            mode: "markers",
            marker: { color, size: 5 },
            type: "scatter",
            hovertemplate: `${xAxisLabel} = <b>%{x}</b> <br>${yAxisLabel} = <b>%{y}</b> <br>Realization = <b>%{text}</b> <extra></extra>`,
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
        },
    ];
}
