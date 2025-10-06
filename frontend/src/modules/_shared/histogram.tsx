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
    const xMin = xValues.reduce((min, v) => Math.min(min, v), Infinity);
    const xMax = xValues.reduce((max, v) => Math.max(max, v), -Infinity);
    const range = xMax - xMin;

    const binSize = range / numBins;

    // Add epsilon to ensure the last bin includes the maximum value
    // This is necessary because Plotly's histogram bins are [start, end) intervals
    const EPSILON_MULTIPLIER = 1e-6;
    const MIN_EPSILON = 1e-10;
    const epsilon = Math.max(binSize * EPSILON_MULTIPLIER, MIN_EPSILON);
    const end = xMax + epsilon;

    // Adjust binSize to maintain exactly numBins
    const adjustedBinSize = (range + epsilon) / numBins;
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
            size: adjustedBinSize,
        },

        autobinx: false,
        hovertemplate: "Range: %{x}<br>Percentage: %{y:.2f}%<extra></extra>",
        texttemplate: "%{y:.1f}%",
        textposition: "outside",
    };

    return trace;
}
