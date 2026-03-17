import React from "react";

import type ReactECharts from "echarts-for-react";

import { useClickToTimestamp } from "./useClickToTimestamp";
import { useClosestRealizationTooltip } from "./useClosestRealizationTooltip";
import { useHighlightOnHover } from "./useHighlightOnHover";
import type { HighlightOnHoverEvents, HoveredRealizationInfo } from "./useHighlightOnHover";

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
    /** Called when the hovered realization changes (null = nothing hovered). */
    onHoveredRealizationChange?: (info: HoveredRealizationInfo | null) => void;
    /** Externally-driven highlighted realization (e.g. from another module via synced settings). */
    externalHoveredRealization?: HoveredRealizationInfo | null;
    /** Show only the nearest realization tooltip while hovering the empty chart area. */
    enableClosestRealizationTooltip?: boolean;
};

export type TimeseriesInteractionResult = {
    chartRef: React.RefObject<ReactECharts>;
    onChartEvents: HighlightOnHoverEvents;
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

    const onChartEvents = useHighlightOnHover(chartRef, config.enableLinkedHover, {
        onHoveredRealizationChange: config.onHoveredRealizationChange,
        externalHoveredRealization: config.externalHoveredRealization,
    });

    useClickToTimestamp(
        chartRef,
        config.timestamps,
        config.activeTimestampUtcMs,
        config.setActiveTimestampUtcMs,
        config.layoutDependency,
    );
    useClosestRealizationTooltip(
        chartRef,
        config.enableClosestRealizationTooltip ?? false,
        config.timestamps,
        config.layoutDependency,
    );

    return { chartRef, onChartEvents };
}
