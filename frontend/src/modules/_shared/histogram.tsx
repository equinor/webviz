import type { PlotData } from "plotly.js";

export function makeHistogramTrace({
    xValues,
    numBins,
    color,
}: {
    xValues: number[];
    numBins: number;
    color: string;
}): Partial<PlotData> {
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const range = xMax - xMin;

    const binSize = range / numBins;

    // Add epsilon to ensure the last bin includes the maximum value
    // This is necessary because Plotly's histogram bins are [start, end) intervals
    const end = xMax + Math.max(binSize * 1e-6, 1e-10);

    const trace: Partial<PlotData> = {
        x: xValues,
        type: "histogram",

        marker: {
            color: color,
            line: {
                color: "black",
                width: 1,
            },
        },
        showlegend: false,

        histnorm: "percent",
        xbins: {
            start: xMin,
            end: end,
            size: binSize,
        },

        autobinx: false,
        hovertemplate: "Range: %{x}<br>Percentage: %{y:.2f}%<extra></extra>",
        texttemplate: "%{y:.1f}%",
        textposition: "outside",
    };

    return trace;
}
