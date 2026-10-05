import { describe, expect, test } from "vitest";

import { calcConvergenceArray } from "@modules/InplaceVolumesNew/view/utils/plotly/convergence";
import { makePlotlyHistogramTraces } from "@modules/InplaceVolumesNew/view/utils/plotly/histogram";

describe("inplace plots with missing values", function missingValuePlotTests() {
    test("convergence keeps valid realization IDs and excludes missing samples", function filtersConvergenceSamples() {
        const samples = [
            { realization: 4, resultValue: 20 },
            { realization: 2, resultValue: NaN },
            { realization: 1, resultValue: 10 },
            { realization: 3, resultValue: Infinity },
        ];
        const originalSamples = [...samples];

        expect(calcConvergenceArray(samples)).toEqual([
            { realization: 1, mean: 10, p10: 10, p90: 10 },
            { realization: 4, mean: 15, p10: 19, p90: 11 },
        ]);
        expect(samples).toEqual(originalSamples);
        expect(calcConvergenceArray([{ realization: 0, resultValue: NaN }])).toEqual([]);
    });

    test("histogram bins and marker heights use only finite samples", function filtersHistogramSamples() {
        const traces = makeHistogramTraces([10, NaN, 20, Infinity]);
        const histogram = traces.find((trace) => trace.type === "histogram")!;
        const mean = traces.find((trace) => trace.name === "Mean")!;
        const rug = traces.find((trace) => trace.name === "Realizations")!;

        expect(histogram.x).toEqual([10, 20]);
        expect(histogram.xbins?.start).toBe(10);
        expect(Number.isFinite(histogram.xbins?.size)).toBe(true);
        expect(mean.x).toEqual([15, 15]);
        expect(mean.y).toEqual([0, 52.5]);
        expect(rug.x).toEqual([10, NaN, 20, Infinity]);
    });

    test("histogram handles all-missing and single-value groups", function handlesSparseHistogram() {
        expect(makeHistogramTraces([NaN, Infinity])).toEqual([]);
        const mean = makeHistogramTraces([NaN, 10]).find((trace) => trace.name === "Mean")!;
        expect(mean.x).toEqual([10, 10]);
        expect(mean.y).toEqual([0, 105]);
    });
});

function makeHistogramTraces(values: number[]) {
    return makePlotlyHistogramTraces({
        title: "Delta",
        values,
        resultName: "STOIIP",
        color: "red",
        numBins: 2,
        showStatisticalMarkers: true,
        showRealizationPoints: true,
        showStatisticalLabels: true,
        showPercentageInBar: true,
    });
}
