import type { PlotDatum } from "plotly.js";

export function getNumericPlotlyPointX(point: Pick<PlotDatum, "data" | "pointIndex">): number | undefined {
    if (!("x" in point.data) || !point.data.x) {
        return undefined;
    }
    const value = point.data.x[point.pointIndex];
    return typeof value === "number" ? value : undefined;
}
