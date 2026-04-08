import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

import type { HoveredSeriesInfo, InteractionSeries, InteractionSeriesEntry } from "../interaction";
import {
    buildHoveredSeriesInfo,
    formatScatterInteractionTooltip,
    formatTimeseriesInteractionTooltip,
    resolveClosestSeriesEntry,
} from "../interaction";

type ZrMouseEvent = {
    offsetX?: number;
    offsetY?: number;
};

type TooltipTriggerOn = "none" | "click" | "mousemove" | "mousemove|click";

export type SeriesInteractionOptions = {
    onHoveredSeriesChange?: (info: HoveredSeriesInfo | null) => void;
    externalHoveredSeries?: HoveredSeriesInfo | null;
    formatSeriesLabel?: (info: HoveredSeriesInfo) => string;
    interactionSeries: InteractionSeries;
};

export type SeriesInteractionEvents = {
    mouseout: () => void;
    globalout: () => void;
};

/**
 * Unified hook for series interaction: closest-series tooltip + cross-subplot highlighting.
 *
 * Uses ZR-level mousemove to find the series entry closest to the cursor (by Y distance in
 * timeseries mode, by pixel distance in scatter mode), then atomically highlights that entry
 * across all subplots and shows a tooltip for it.
 *
 * Hit-testing, tooltip formatting, and HoveredSeriesInfo construction are delegated to
 * pure functions in the interaction/ module.
 */
export function useSeriesInteraction(
    chartRef: React.RefObject<ReactECharts | null>,
    enabled: boolean,
    layoutDependency: unknown,
    options: SeriesInteractionOptions,
): SeriesInteractionEvents {
    const onHoveredSeriesChange = options.onHoveredSeriesChange;
    const externalHoveredSeries = options.externalHoveredSeries;
    const formatSeriesLabel = options.formatSeriesLabel;
    const interactionSeries = options.interactionSeries;

    const lastTargetKeyRef = React.useRef<string | null>(null);
    const lastReportedSeriesRef = React.useRef<string | null>(null);
    const rafIdRef = React.useRef<number | null>(null);

    const clearAll = React.useCallback(
        function clearAllInteraction() {
            const chart = chartRef.current;
            if (!chart) return;

            const instance = chart.getEchartsInstance();
            if (instance.isDisposed()) return;
            instance.dispatchAction({ type: "downplay" });
            instance.dispatchAction({ type: "hideTip" });
            instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });

            lastTargetKeyRef.current = null;

            if (lastReportedSeriesRef.current !== null) {
                lastReportedSeriesRef.current = null;
                onHoveredSeriesChange?.(null);
            }
        },
        [chartRef, onHoveredSeriesChange],
    );

    // Attach ZR-level mousemove/globalout listeners to drive interaction.
    React.useEffect(
        function manageSeriesInteractionEffect() {
            const chart = chartRef.current;
            if (!chart || !enabled) return;

            const instance = chart.getEchartsInstance();
            if (interactionSeries.seriesByAxisIndex.size === 0) return;

            const originalTriggerOn = readTooltipTriggerOn(instance);
            disableDefaultTooltipTrigger(instance);
            let attachFrameId: number | null = null;
            let removeListeners: (() => void) | null = null;

            function cancelRaf() {
                if (rafIdRef.current != null) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }
            }

            function attachListenersWhenReady() {
                const currentChart = chartRef.current;
                if (!currentChart) return;

                const currentInstance = currentChart.getEchartsInstance();
                const zr = currentInstance.getZr();
                if (!zr) {
                    attachFrameId = requestAnimationFrame(attachListenersWhenReady);
                    return;
                }

                function onMouseMove(event: ZrMouseEvent) {
                    if (rafIdRef.current != null) return;
                    rafIdRef.current = requestAnimationFrame(function processPointerMove() {
                        rafIdRef.current = null;
                        handlePointerMove(
                            event,
                            currentInstance,
                            interactionSeries,
                            formatSeriesLabel,
                            lastTargetKeyRef,
                            lastReportedSeriesRef,
                            onHoveredSeriesChange,
                        );
                    });
                }

                function onGlobalOut() {
                    cancelRaf();
                    clearAllFromInstance(
                        currentInstance,
                        lastTargetKeyRef,
                        lastReportedSeriesRef,
                        onHoveredSeriesChange,
                    );
                }

                zr.on("mousemove", onMouseMove);
                zr.on("globalout", onGlobalOut);

                removeListeners = function removeSeriesInteractionListeners() {
                    zr.off("mousemove", onMouseMove);
                    zr.off("globalout", onGlobalOut);
                    cancelRaf();
                    clearAllFromInstance(
                        currentInstance,
                        lastTargetKeyRef,
                        lastReportedSeriesRef,
                        onHoveredSeriesChange,
                    );
                    restoreTooltipTriggerOn(currentInstance, originalTriggerOn);
                };
            }

            attachListenersWhenReady();

            return function cleanupSeriesInteraction() {
                if (attachFrameId != null) {
                    cancelAnimationFrame(attachFrameId);
                }
                cancelRaf();
                removeListeners?.();
            };
        },
        [chartRef, enabled, layoutDependency, formatSeriesLabel, interactionSeries, onHoveredSeriesChange, clearAll],
    );

    // Apply external hover highlight from other components.
    React.useEffect(
        function applyExternalHoverEffect() {
            if (!enabled || !chartRef.current || !externalHoveredSeries) return;

            const instance = chartRef.current.getEchartsInstance();
            if (instance.isDisposed()) return;
            const actions = interactionSeries.matchingSeriesIndicesByKey.get(externalHoveredSeries.interactionKey) ?? [];
            if (actions.length === 0) return;

            instance.dispatchAction({ type: "downplay" });
            for (const seriesIndex of actions) {
                instance.dispatchAction({ type: "highlight", seriesIndex });
            }
            lastTargetKeyRef.current = `external:${externalHoveredSeries.interactionKey}`;
        },
        [enabled, chartRef, externalHoveredSeries, interactionSeries],
    );

    React.useEffect(
        function clearExternalHoverEffect() {
            if (externalHoveredSeries === null && lastTargetKeyRef.current?.startsWith("external:")) {
                clearAll();
            }
        },
        [externalHoveredSeries, clearAll],
    );

    React.useEffect(
        function cleanupRafEffect() {
            return function cancelPendingRaf() {
                if (rafIdRef.current != null) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }
            };
        },
        [],
    );

    return React.useMemo(
        function buildSeriesInteractionEvents() {
            return {
                mouseout: function handleMouseOut() {
                    // Intentional no-op: globalout on ZR handles cleanup.
                },
                globalout: function handleGlobalOut() {
                    clearAll();
                },
            };
        },
        [clearAll],
    );
}

// ---------------------------------------------------------------------------
// Non-React helpers (pure ECharts dispatch logic)
// ---------------------------------------------------------------------------

function handlePointerMove(
    event: ZrMouseEvent,
    instance: ECharts,
    interactionIndex: InteractionSeries,
    formatSeriesLabel: ((info: HoveredSeriesInfo) => string) | undefined,
    lastTargetKeyRef: React.MutableRefObject<string | null>,
    lastReportedSeriesRef: React.MutableRefObject<string | null>,
    onHoveredSeriesChange: ((info: HoveredSeriesInfo | null) => void) | undefined,
): void {
    const pixelX = typeof event.offsetX === "number" ? event.offsetX : null;
    const pixelY = typeof event.offsetY === "number" ? event.offsetY : null;

    if (pixelX == null || pixelY == null) {
        clearAllFromInstance(instance, lastTargetKeyRef, lastReportedSeriesRef, onHoveredSeriesChange);
        return;
    }

    const target = resolveClosestSeriesEntry(instance, interactionIndex, pixelX, pixelY);
    if (!target) {
        clearAllFromInstance(instance, lastTargetKeyRef, lastReportedSeriesRef, onHoveredSeriesChange);
        return;
    }

    const targetKey = `${target.entry.interactionKey}:${target.dataIndex}`;
    if (lastTargetKeyRef.current === targetKey) return;
    lastTargetKeyRef.current = targetKey;

    const timestampUtcMs = resolveTimeseriesTimestampUtcMs(interactionIndex, target.entry, target.dataIndex);
    const hoveredSeriesInfo = buildHoveredSeriesInfo(target.entry, target.dataIndex, timestampUtcMs);

    applyHighlight(instance, target.matchingSeriesIndices);

    if (interactionIndex.resolutionMode === "timeseries" && timestampUtcMs !== undefined) {
        instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "mousemove", x: pixelX, y: pixelY });
        instance.dispatchAction({
            type: "showTip",
            x: pixelX,
            y: pixelY,
            tooltip: {
                content: formatTimeseriesInteractionTooltip(
                    target.entry, hoveredSeriesInfo, timestampUtcMs, target.dataIndex, formatSeriesLabel,
                ),
            },
        });
    } else {
        instance.dispatchAction({
            type: "showTip",
            x: pixelX,
            y: pixelY,
            tooltip: {
                content: formatScatterInteractionTooltip(target.entry, hoveredSeriesInfo, formatSeriesLabel),
            },
        });
    }

    if (lastReportedSeriesRef.current !== target.entry.interactionKey) {
        lastReportedSeriesRef.current = target.entry.interactionKey;
        onHoveredSeriesChange?.(hoveredSeriesInfo);
    }
}

function resolveTimeseriesTimestampUtcMs(
    interactionIndex: InteractionSeries,
    entry: InteractionSeriesEntry,
    dataIndex: number,
): number | undefined {
    if (interactionIndex.resolutionMode !== "timeseries") return undefined;
    const timestampUtcMs = entry.xValues[dataIndex];
    return Number.isFinite(timestampUtcMs) ? timestampUtcMs : undefined;
}

function applyHighlight(instance: ECharts, matchingSeriesIndices: number[]): void {
    if (instance.isDisposed()) return;
    instance.dispatchAction({ type: "downplay" });
    for (const seriesIndex of matchingSeriesIndices) {
        instance.dispatchAction({ type: "highlight", seriesIndex });
    }
}

function clearAllFromInstance(
    instance: ECharts,
    lastTargetKeyRef: React.MutableRefObject<string | null>,
    lastReportedSeriesRef: React.MutableRefObject<string | null>,
    onHoveredSeriesChange: ((info: HoveredSeriesInfo | null) => void) | undefined,
): void {
    if (!instance.isDisposed()) {
        instance.dispatchAction({ type: "downplay" });
        instance.dispatchAction({ type: "hideTip" });
        instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });
    }

    lastTargetKeyRef.current = null;

    if (lastReportedSeriesRef.current !== null) {
        lastReportedSeriesRef.current = null;
        onHoveredSeriesChange?.(null);
    }
}

function disableDefaultTooltipTrigger(instance: ECharts): void {
    if (instance.isDisposed()) return;
    instance.setOption({ tooltip: { triggerOn: "none" } });
}

function readTooltipTriggerOn(instance: ECharts): TooltipTriggerOn {
    const tooltipOption = instance.getOption()?.tooltip;
    if (Array.isArray(tooltipOption)) {
        const triggerOn = tooltipOption[0] && typeof tooltipOption[0] === "object" ? tooltipOption[0].triggerOn : undefined;
        return isTooltipTriggerOn(triggerOn) ? triggerOn : "mousemove|click";
    }

    const triggerOn = tooltipOption && typeof tooltipOption === "object" ? tooltipOption.triggerOn : undefined;
    return isTooltipTriggerOn(triggerOn) ? triggerOn : "mousemove|click";
}

function restoreTooltipTriggerOn(instance: ECharts, triggerOn: TooltipTriggerOn): void {
    if (instance.isDisposed()) return;
    instance.setOption({ tooltip: { triggerOn } });
}

function isTooltipTriggerOn(value: unknown): value is TooltipTriggerOn {
    return value === "none" || value === "click" || value === "mousemove" || value === "mousemove|click";
}