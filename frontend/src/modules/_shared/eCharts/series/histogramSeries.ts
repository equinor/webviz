import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { DistributionTrace, PointStatistics } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type HistogramDisplayOptions = {
    numBins?: number;
    showStatisticalMarkers?: boolean;
    showStatisticalLabels?: boolean;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
};

export function buildHistogramSeries(
    trace: DistributionTrace,
    options: HistogramDisplayOptions = {},
    axisIndex = 0,
): any[] {
    const {
        numBins = 15,
        showStatisticalMarkers = false,
        showRealizationPoints = false,
        showPercentageInBar = false,
    } = options;

    if (trace.values.length === 0) return [];

    const stats = computePointStatistics(trace.values);
    const { binEdges, percentages } = computeBins(trace.values, numBins);

    const barData = percentages.map((pct, i) => [binEdges[i] + (binEdges[i + 1] - binEdges[i]) / 2, pct]);

    const series: any[] = [];

    series.push({
        type: "bar",
        name: trace.name,
        data: barData,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        barWidth: `${90 / numBins}%`,
        itemStyle: {
            color: trace.color,
            opacity: showStatisticalMarkers ? 0.6 : 1,
            borderColor: "black",
            borderWidth: 1,
        },
        label: showPercentageInBar
            ? {
                  show: true,
                  position: "top",
                  formatter: (p: any) => `${(p.value[1] as number).toFixed(1)}%`,
                  fontSize: 10,
              }
            : undefined,
    });

    if (showStatisticalMarkers) {
        const maxPct = Math.max(...percentages) * 1.05;
        series.push(...createHistogramStatLines(stats, maxPct, trace, axisIndex, options.showStatisticalLabels));
    }

    if (showRealizationPoints) {
        series.push({
            type: "scatter",
            name: "Realizations",
            data: trace.values.map((v) => [v, -2]),
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            symbol: "rect",
            symbolSize: [2, 10],
            itemStyle: { color: trace.color, opacity: 0.6 },
            silent: true,
        });
    }

    return series;
}

function computeBins(values: number[], numBins: number): { binEdges: number[]; percentages: number[] } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const binSize = range / numBins;

    const binEdges: number[] = [];
    for (let i = 0; i <= numBins; i++) {
        binEdges.push(min + i * binSize);
    }

    const counts = new Array(numBins).fill(0);
    for (const v of values) {
        const idx = Math.min(Math.floor((v - min) / binSize), numBins - 1);
        counts[idx]++;
    }

    const total = values.length;
    const percentages = counts.map((c) => (c / total) * 100);

    return { binEdges, percentages };
}

function createHistogramStatLines(
    stats: PointStatistics,
    maxPct: number,
    trace: DistributionTrace,
    axisIndex: number,
    showLabels = false,
): any[] {
    function makeLine(value: number, label: string, dash: string): any {
        return {
            type: "line",
            name: `${trace.name} ${label}`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: [
                [value, 0],
                [value, maxPct],
            ],
            lineStyle: { color: trace.color, width: 4, type: dash },
            symbol: "none",
            silent: true,
            label: showLabels
                ? {
                      show: true,
                      position: "end",
                      formatter: `${label}: ${formatNumber(value)}`,
                      fontSize: 11,
                  }
                : undefined,
        };
    }

    return [
        makeLine(stats.p10, "P10", "dashed"),
        makeLine(stats.mean, "Mean", "solid"),
        makeLine(stats.p90, "P90", "dashed"),
    ];
}
