import React from "react";

import type ReactECharts from "echarts-for-react";

import { useClickToTimestamp } from "./useClickToTimestamp";
import { useClosestMemberTooltip } from "./useClosestMemberTooltip";
import { useHighlightOnHover } from "./useHighlightOnHover";
import type { HighlightOnHoverEvents, HoveredMemberInfo } from "./useHighlightOnHover";

export type TimeseriesInteractionConfig = {
    /** Enable linked-member hover highlighting across subplots. */
    enableLinkedHover: boolean;
    /** Timestamps for click-to-timestamp selection. Pass empty array to disable. */
    timestamps: number[];
    /** Currently active timestamp (null = none selected). */
    activeTimestampUtcMs: number | null;
    /** Setter for the active timestamp. */
    setActiveTimestampUtcMs: (ts: number | null) => void;
    /** Any value that changes when the chart layout changes (usually the option object). */
    layoutDependency: unknown;
    /** Called when the hovered member changes (null = nothing hovered). */
    onHoveredMemberChange?: (info: HoveredMemberInfo | null) => void;
    /** Externally-driven highlighted member (e.g. from another module via synced settings). */
    externalHoveredMember?: HoveredMemberInfo | null;
    /** Show only the nearest member tooltip while hovering the empty chart area. */
    enableClosestMemberTooltip?: boolean;
};

export type TimeseriesInteractionResult = {
    chartRef: React.RefObject<ReactECharts>;
    onChartEvents: HighlightOnHoverEvents;
};

/**
 * Wires up the standard timeseries interaction hooks:
 * - linked member highlighting on hover
 * - click-to-timestamp selection
 *
 * Returns a `chartRef` and the event handlers to pass to `ReactECharts`.
 */
export function useTimeseriesInteractions(config: TimeseriesInteractionConfig): TimeseriesInteractionResult {
    const chartRef = React.useRef<ReactECharts>(null);

    const onChartEvents = useHighlightOnHover(chartRef, config.enableLinkedHover, {
        onHoveredMemberChange: config.onHoveredMemberChange,
        externalHoveredMember: config.externalHoveredMember,
    });

    useClickToTimestamp(
        chartRef,
        config.timestamps,
        config.activeTimestampUtcMs,
        config.setActiveTimestampUtcMs,
        config.layoutDependency,
    );
    useClosestMemberTooltip(
        chartRef,
        config.enableClosestMemberTooltip ?? false,
        config.timestamps,
        config.layoutDependency,
    );

    return { chartRef, onChartEvents };
}
