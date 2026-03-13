import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { DistributionTrace, PointStatistics } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type BoxPlotDisplayOptions = {
    showStatisticalMarkers?: boolean;
    showRealizationPoints?: boolean;
    yAxisPosition?: number;
};

export function buildBoxPlotSeries(
    trace: DistributionTrace,
    options: BoxPlotDisplayOptions = {},
    axisIndex = 0,
): any[] {
    const { showStatisticalMarkers = false, showRealizationPoints = false, yAxisPosition = 0 } = options;

    if (trace.values.length === 0) return [];

    const stats = computePointStatistics(trace.values);
    const sorted = [...trace.values].sort((a, b) => a - b);

    const series: any[] = [];

    // ECharts boxplot expects [min, Q1, median, Q3, max]
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);

    series.push({
        type: "boxplot",
        name: trace.name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: [[stats.min, q1, stats.p50, q3, stats.max]],
        itemStyle: { color: trace.color, borderColor: trace.color },
        tooltip: {
            formatter: (params: any) => {
                const d = params.value;
                return (
                    `<b>${trace.name}</b><br/>` +
                    `Min: ${formatNumber(d[1])}<br/>` +
                    `Q1: ${formatNumber(d[2])}<br/>` +
                    `Median: ${formatNumber(d[3])}<br/>` +
                    `Q3: ${formatNumber(d[4])}<br/>` +
                    `Max: ${formatNumber(d[5])}`
                );
            },
        },
    });

    if (showRealizationPoints) {
        series.push({
            type: "scatter",
            name: `${trace.name} points`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: trace.values.map((v) => [v, yAxisPosition]),
            symbol: "circle",
            symbolSize: 4,
            itemStyle: { color: trace.color, opacity: 0.5 },
        });
    }

    if (showStatisticalMarkers) {
        series.push(...createBoxStatMarkers(stats, trace, yAxisPosition, axisIndex));
    }

    return series;
}

function createBoxStatMarkers(
    stats: PointStatistics,
    trace: DistributionTrace,
    yPos: number,
    axisIndex: number,
): any[] {
    function makeMarker(value: number, label: string): any {
        return {
            type: "scatter",
            name: `${trace.name} ${label}`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: [[value, yPos]],
            symbol: "path://M-1,-1L1,1M1,-1L-1,1", // X shape
            symbolSize: 10,
            itemStyle: { color: trace.color },
            tooltip: {
                formatter: () => `<b>${trace.name}</b><br/>${label}: ${formatNumber(value)}`,
            },
        };
    }

    return [makeMarker(stats.p10, "P10"), makeMarker(stats.mean, "Mean"), makeMarker(stats.p90, "P90")];
}

function quantile(sorted: number[], q: number): number {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const frac = pos - base;
    if (base + 1 < sorted.length) {
        return sorted[base] + frac * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
}
