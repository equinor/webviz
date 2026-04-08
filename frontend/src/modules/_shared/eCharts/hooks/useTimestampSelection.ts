import React from "react";

import type ReactECharts from "echarts-for-react";

import { useActiveTimestampMarker } from "./useActiveTimestampMarker";
import { useClickToTimestamp } from "./useClickToTimestamp";

/**
 * Convenience hook that bundles click-to-timestamp selection with the
 * imperative markLine visualisation. Manages the active-timestamp state
 * internally and returns the current value for display.
 *
 * For modules that need to control the timestamp externally (e.g. driven
 * by another module or a channel), use the two primitive hooks directly:
 * `useClickToTimestamp` + `useActiveTimestampMarker`.
 */
export function useTimestampSelection(
    chartRef: React.RefObject<ReactECharts | null>,
    timestamps: number[],
    chartOption: unknown,
): number | null {
    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);

    useClickToTimestamp(chartRef, timestamps, activeTimestampUtcMs, setActiveTimestampUtcMs, chartOption);
    useActiveTimestampMarker(chartRef, activeTimestampUtcMs, chartOption);

    return activeTimestampUtcMs;
}
