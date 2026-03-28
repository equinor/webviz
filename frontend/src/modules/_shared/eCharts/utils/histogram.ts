import { MinMax } from "@lib/utils/MinMax";

import type { DistributionTrace, PointStatistics } from "../types";
import { HistogramType } from "../types";

import { computePointStatistics } from "./statistics";

export type HistogramBin = {
    start: number;
    end: number;
    count: number;
    percentage: number;
};

export type HistogramTraceData = {
    trace: DistributionTrace;
    stats: PointStatistics;
    bins: HistogramBin[];
};

export type HistogramBarGeometry = {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
    count: number;
    percentage: number;
};

export type HistogramLayoutResult = {
    barsByTrace: HistogramBarGeometry[][];
    yMax: number;
};

export function computeHistogramTraceData(traces: DistributionTrace[], numBins: number): HistogramTraceData[] {
    if (traces.length === 0) {
        return [];
    }

    const binEdges = computeSharedBinEdges(traces, numBins);

    return traces.map((trace) => ({
        trace,
        stats: computePointStatistics(trace.values),
        bins: computeHistogramBins(trace.values, binEdges),
    }));
}

export function computeHistogramLayout(
    traceData: HistogramTraceData[],
    histogramType: HistogramType,
): HistogramLayoutResult {
    const numTraces = traceData.length;
    const numBins = traceData[0]?.bins.length ?? 0;
    const barsByTrace = traceData.map(() => [] as HistogramBarGeometry[]);
    let yMax = 0;

    for (let binIndex = 0; binIndex < numBins; binIndex++) {
        const referenceBin = traceData[0].bins[binIndex];
        const binWidth = referenceBin.end - referenceBin.start;
        let cumulativeY = 0;

        for (let traceIndex = 0; traceIndex < numTraces; traceIndex++) {
            const bin = traceData[traceIndex].bins[binIndex];
            const percentage = bin.percentage;

            if (histogramType === HistogramType.Group) {
                const groupWidth = binWidth / numTraces;
                const xStart = referenceBin.start + traceIndex * groupWidth;
                const xEnd = xStart + groupWidth;
                barsByTrace[traceIndex].push({
                    xStart,
                    xEnd,
                    yStart: 0,
                    yEnd: percentage,
                    count: bin.count,
                    percentage,
                });
                yMax = Math.max(yMax, percentage);
                continue;
            }

            if (histogramType === HistogramType.Stack || histogramType === HistogramType.Relative) {
                const yStart = cumulativeY;
                const yEnd = cumulativeY + percentage;
                barsByTrace[traceIndex].push({
                    xStart: referenceBin.start,
                    xEnd: referenceBin.end,
                    yStart,
                    yEnd,
                    count: bin.count,
                    percentage,
                });
                cumulativeY = yEnd;
                yMax = Math.max(yMax, yEnd);
                continue;
            }

            barsByTrace[traceIndex].push({
                xStart: referenceBin.start,
                xEnd: referenceBin.end,
                yStart: 0,
                yEnd: percentage,
                count: bin.count,
                percentage,
            });
            yMax = Math.max(yMax, percentage);
        }
    }

    return { barsByTrace, yMax };
}

function computeSharedBinEdges(traces: DistributionTrace[], numBins: number): number[] {
    const allValues = traces.flatMap((trace) => trace.values);
    const minMax = MinMax.fromNumericValues(allValues);
    const min = minMax.isValid() ? minMax.min : 0;
    const max = minMax.isValid() ? minMax.max : numBins;
    const range = max - min || 1;
    const binSize = range / numBins;
    const epsilon = Math.max(binSize * 1e-6, 1e-10);
    const adjustedBinSize = (range + epsilon) / numBins;

    return Array.from({ length: numBins + 1 }, (_, index) => min + index * adjustedBinSize);
}

function computeHistogramBins(values: number[], binEdges: number[]): HistogramBin[] {
    const counts = new Array(Math.max(binEdges.length - 1, 0)).fill(0);
    const min = binEdges[0] ?? 0;
    const binSize = (binEdges[1] ?? min + 1) - min || 1;

    for (const value of values) {
        const index = Math.min(Math.floor((value - min) / binSize), counts.length - 1);
        counts[Math.max(index, 0)]++;
    }

    return counts.map((count, index) => ({
        start: binEdges[index],
        end: binEdges[index + 1],
        count,
        percentage: values.length > 0 ? (count / values.length) * 100 : 0,
    }));
}
