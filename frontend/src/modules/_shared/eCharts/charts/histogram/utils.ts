import type { SubplotAxesResult } from "../../layout";
import { HistogramType } from "../../types";

export function computeBarOpacity(histogramType: HistogramType, traceCount: number): number {
    if (histogramType === HistogramType.Overlay && traceCount > 1) return 0.55;
    return 1;
}

export function applyYAxisExtents(axes: SubplotAxesResult, yMaxByAxis: number[], showRealizationPoints: boolean): void {
    for (const [axisIndex, yMax] of yMaxByAxis.entries()) {
        const yAxis = axes.yAxes[axisIndex];
        axes.yAxes[axisIndex] = {
            ...yAxis,
            min: showRealizationPoints ? -4 : 0,
            max: Math.max(yMax * 1.1, 1),
        };
    }
}