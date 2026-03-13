import type { DistributionTrace } from "../types";

export type DistributionDisplayOptions = {
    showRealizationPoints?: boolean;
};

/**
 * ECharts doesn't have a native violin/KDE series type.
 * This builds a custom KDE-based polygon + optional scatter overlay.
 */
export function buildDistributionSeries(
    trace: DistributionTrace,
    options: DistributionDisplayOptions = {},
    axisIndex = 0,
): any[] {
    const { showRealizationPoints = false } = options;

    if (trace.values.length < 2) return [];

    const sorted = [...trace.values].sort((a, b) => a - b);
    const kde = computeKde(sorted, 200);

    const series: any[] = [];

    // KDE curve as a filled area
    series.push({
        type: "line",
        name: trace.name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: kde.map(([x, y]) => [x, y]),
        areaStyle: { color: trace.color, opacity: 0.3 },
        lineStyle: { color: trace.color, width: 1.5 },
        symbol: "none",
        smooth: true,
    });

    if (showRealizationPoints) {
        // Jittered scatter at y = 0
        series.push({
            type: "scatter",
            name: `${trace.name} points`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: trace.values.map((v) => [v, -0.01 * Math.max(...kde.map((k) => k[1]))]),
            symbol: "circle",
            symbolSize: 4,
            itemStyle: { color: trace.color, opacity: 0.5 },
        });
    }

    return series;
}

function computeKde(sorted: number[], numPoints: number): [number, number][] {
    const n = sorted.length;
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min || 1;

    // Silverman's rule of thumb for bandwidth
    const stdDev = Math.sqrt(sorted.reduce((s, v) => s + (v - sorted.reduce((a, b) => a + b, 0) / n) ** 2, 0) / n);
    const iqr = sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)];
    const bandwidth = 0.9 * Math.min(stdDev, iqr / 1.34) * Math.pow(n, -0.2);
    const h = bandwidth || range / 20;

    const pad = range * 0.1;
    const step = (range + 2 * pad) / numPoints;
    const result: [number, number][] = [];

    for (let i = 0; i < numPoints; i++) {
        const x = min - pad + i * step;
        let density = 0;
        for (const v of sorted) {
            const z = (x - v) / h;
            density += Math.exp(-0.5 * z * z);
        }
        density /= n * h * Math.sqrt(2 * Math.PI);
        result.push([x, density]);
    }

    return result;
}
