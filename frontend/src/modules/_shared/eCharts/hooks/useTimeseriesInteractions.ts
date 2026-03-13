import React from "react";

import type ReactECharts from "echarts-for-react";

import { useClickToTimestamp } from "./useClickToTimestamp";
import { useHighlightOnHover } from "./useHighlightOnHover";

export type TimeseriesInteractionConfig = {
    /** Enable linked-realization hover highlighting across subplots. */
    enableLinkedHover: boolean;
    /** Timestamps for click-to-timestamp selection. Pass empty array to disable. */
    timestamps: number[];
    /** Currently active timestamp (null = none selected). */
    activeTimestampUtcMs: number | null;
    /** Setter for the active timestamp. */
    setActiveTimestampUtcMs: (ts: number | null) => void;
    /** Any value that changes when the chart layout changes (usually the option object). */
    layoutDependency: unknown;
};

export type TimeseriesInteractionResult = {
    chartRef: React.RefObject<ReactECharts>;
    onChartEvents: Record<string, (e: any) => void>;
};

/**
 * Wires up the standard timeseries interaction hooks:
 * - linked realization highlighting on hover
 * - click-to-timestamp selection
 *
 * Returns a `chartRef` and the event handlers to pass to `ReactECharts`.
 */
export function useTimeseriesInteractions(config: TimeseriesInteractionConfig): TimeseriesInteractionResult {
    const chartRef = React.useRef<ReactECharts>(null);

    const onChartEvents = useHighlightOnHover(chartRef, config.enableLinkedHover);

    useClickToTimestamp(
        chartRef,
        config.timestamps,
        config.activeTimestampUtcMs,
        config.setActiveTimestampUtcMs,
        config.layoutDependency,
    );

    return { chartRef, onChartEvents };
}
