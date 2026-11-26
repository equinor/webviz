import type { ScatterData, ScatterglData } from "plotly.js";

export type TimeSeriesPlotData = ScatterData | ScatterglData;

type ScatterLine = Pick<NonNullable<ScatterData["line"]>, "color" | "shape" | "width">;
type ScatterglLine = Pick<NonNullable<ScatterglData["line"]>, "color" | "shape" | "width">;

export function makeTimeSeriesLine(
    type: "scatter" | "scattergl",
    line: ScatterLine,
): { type: "scatter"; line: ScatterLine } | { type: "scattergl"; line: ScatterglLine } {
    if (type === "scattergl") {
        return { type, line: { ...line, shape: line.shape === "spline" ? "linear" : line.shape } };
    }
    return { type, line };
}
