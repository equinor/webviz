import { describe, expect, it } from "vitest";

import { createHistoricalVectorTrace, createVectorRealizationTrace } from "@modules/SimulationTimeSeries/view/utils/PlotlyTraceUtils/createVectorTracesUtils";
import { createFanchartTraces } from "@modules/SimulationTimeSeries/view/utils/PlotlyTraceUtils/fanchartPlotting";
import { createStatisticsTraces } from "@modules/SimulationTimeSeries/view/utils/PlotlyTraceUtils/statisticsPlotting";

describe("time-series spline traces", function () {
    for (const [type, expectedShape] of [["scatter", "spline"], ["scattergl", "linear"]] as const) {
        it(`uses ${expectedShape} for ${type}`, function () {
            const vector = { timestampsUtcMs: [1, 2], values: [3, 4], unit: "", isRate: false };
            const traces = [
                createHistoricalVectorTrace({ vectorHistoricalData: vector, type, lineShape: "spline" }),
                createVectorRealizationTrace({ vectorRealizationData: { ...vector, realization: 0 }, color: "red", legendGroup: "g", type, lineShape: "spline" }),
                ...createFanchartTraces({ data: { samples: [1, 2], freeLine: { name: "mean", data: [3, 4] } }, hexColor: "#ff0000", legendGroup: "g", type, lineShape: "spline" }),
                ...createStatisticsTraces({ data: { samples: [1, 2], freeLine: { name: "mean", data: [3, 4] } }, color: "red", legendGroup: "g", type, lineShape: "spline" }),
            ];
            for (const trace of traces) {
                expect(trace.type).toBe(type);
                expect(trace.line?.shape).toBe(expectedShape);
            }
        });
    }
});
