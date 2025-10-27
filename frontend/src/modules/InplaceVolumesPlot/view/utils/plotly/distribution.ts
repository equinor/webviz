import type { PlotData } from "plotly.js";

export function makeDistributionPlot(title: string, values: number[], color: string): Partial<PlotData>[] {
    return [
        {
            x: values,
            name: title,
            legendgroup: title,
            type: "violin",
            marker: { color },
            // @ts-expect-error - arguments in the plotly types
            side: "positive",
            y0: 0,
            orientation: "h",
            spanmode: "hard",
            meanline: { visible: true },
            points: false,
            hoverinfo: "none",
        },
    ];
}
