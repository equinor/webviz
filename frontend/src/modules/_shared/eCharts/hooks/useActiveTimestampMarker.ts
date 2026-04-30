import React from "react";

import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { createTimestampMarkLine } from "../overlays/activeTimestampMarker";

/**
 * Imperatively updates the active timestamp markLine on the chart instance
 * without rebuilding the full chart option. Only patches the markLine on the
 * first series of each grid, keeping cost O(numGrids) instead of O(allSeries).
 */
export function useActiveTimestampMarker(
    chartRef: React.RefObject<ReactECharts | null>,
    activeTimestampUtcMs: number | null,
    chartOption: unknown,
): void {
    const prevTimestampRef = React.useRef<number | null>(null);
    const prevChartOptionRef = React.useRef<unknown>(null);

    React.useEffect(function applyActiveTimestampMarkerEffect() {
        const chartChanged = prevChartOptionRef.current !== chartOption;
        const timestampChanged = prevTimestampRef.current !== activeTimestampUtcMs;
        prevChartOptionRef.current = chartOption;
        prevTimestampRef.current = activeTimestampUtcMs;

        // Skip only when neither timestamp nor chart option changed
        if (!timestampChanged && !chartChanged) return;
        // After a chart rebuild with no active timestamp, nothing to apply
        if (activeTimestampUtcMs == null && chartChanged && !timestampChanged) return;

        const instance = chartRef.current?.getEchartsInstance();
        if (!instance || instance.isDisposed()) return;

        const opts = instance.getOption() as { series?: Array<{ xAxisIndex?: number; markLine?: unknown }> } | undefined;
        if (!opts) return;

        const seriesArr = opts.series;
        if (!seriesArr || seriesArr.length === 0) return;

        const markLine = activeTimestampUtcMs != null
            ? createTimestampMarkLine(timestampUtcMsToCompactIsoString(activeTimestampUtcMs))
            : { data: [] };

        // Build a sparse series update: set markLine only on the first series per grid,
        // explicitly clear it on all others so stale markers are removed.
        const seenGrids = new Set<number>();
        const seriesUpdate = seriesArr.map(function assignMarkLinePerGrid(s) {
            const gridIdx = s.xAxisIndex ?? 0;
            if (!seenGrids.has(gridIdx)) {
                seenGrids.add(gridIdx);
                return { markLine };
            }
            return { markLine: { data: [] } };
        });

        instance.setOption({ series: seriesUpdate } as Record<string, unknown>, { lazyUpdate: true });
    }, [chartRef, activeTimestampUtcMs, chartOption]);
}
