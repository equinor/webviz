import { useCallback, useEffect, useMemo, useRef } from "react";

import type { AxisZoomState, ChartZoomState } from "../core/composeChartOption";

type DataZoomEvent = {
    batch?: unknown;
    dataZoomId?: unknown;
    end?: unknown;
    endValue?: unknown;
    start?: unknown;
    startValue?: unknown;
};

/**
 * Syncs ECharts dataZoom events with a persisted zoom state atom.
 * Returns the current zoom state for injecting into chart options,
 * plus a `handleDataZoom` callback to wire into ECharts `onEvents`.
 */
export function useChartZoomSync(
    zoomState: ChartZoomState,
    setZoomState: React.Dispatch<React.SetStateAction<ChartZoomState>>
) {
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastChartZoomStateRef = useRef<ChartZoomState | null>(null);

    const handleDataZoom = useCallback(function handleDataZoomEvent(params: unknown) {
        const updates = extractZoomUpdates(params);
        if (updates.length === 0) {
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(function applyDebouncedZoomUpdate() {
            setZoomState(function mergeZoomState(prev) {
                const next = mergeZoomUpdates(prev, updates);
                lastChartZoomStateRef.current = next;
                return areZoomStatesEqual(prev, next) ? prev : next;
            });
        }, 150);
    }, [setZoomState]);

    useEffect(
        function cleanupDebounceTimerEffect() {
            return function cleanupDebounceTimer() {
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                    debounceTimer.current = null;
                }
            };
        },
        [],
    );

    const appliedZoomState = useMemo(function computeAppliedZoomState() {
        if (lastChartZoomStateRef.current && areZoomStatesEqual(zoomState, lastChartZoomStateRef.current)) {
            return undefined;
        }

        return zoomState;
    }, [zoomState]);

    return useMemo(function buildZoomSyncResult() {
        return { appliedZoomState, handleDataZoom };
    }, [appliedZoomState, handleDataZoom]);
}

function extractZoomUpdates(params: unknown): Array<{ axisKey: "x" | "y"; zoom: AxisZoomState }> {
    if (!params || typeof params !== "object") return [];
    const event = params as DataZoomEvent;
    const rawItems = Array.isArray(event.batch) ? event.batch : [event];
    const updates: Array<{ axisKey: "x" | "y"; zoom: AxisZoomState }> = [];

    rawItems.forEach(function appendZoomUpdate(rawItem) {
        if (!rawItem || typeof rawItem !== "object") {
            return;
        }

        const item = rawItem as DataZoomEvent;
        const start = toFiniteNumber(item.start);
        const end = toFiniteNumber(item.end);
        if (start == null || end == null) {
            return;
        }

        updates.push({
            axisKey: item.dataZoomId === "y" ? "y" : "x",
            zoom: {
                start,
                end,
                ...(item.startValue != null ? { startValue: item.startValue as number | string } : {}),
                ...(item.endValue != null ? { endValue: item.endValue as number | string } : {}),
            },
        });
    });

    return updates;
}

function mergeZoomUpdates(
    previousZoomState: ChartZoomState,
    updates: Array<{ axisKey: "x" | "y"; zoom: AxisZoomState }>,
): ChartZoomState {
    const nextZoomState: ChartZoomState = { ...previousZoomState };

    updates.forEach(function assignZoomUpdate(update) {
        nextZoomState[update.axisKey] = update.zoom;
    });

    return nextZoomState;
}

function areZoomStatesEqual(left: ChartZoomState | null | undefined, right: ChartZoomState | null | undefined): boolean {
    return areAxisZoomStatesEqual(left?.x, right?.x) && areAxisZoomStatesEqual(left?.y, right?.y);
}

function areAxisZoomStatesEqual(left: AxisZoomState | undefined, right: AxisZoomState | undefined): boolean {
    return (
        left?.start === right?.start &&
        left?.end === right?.end &&
        left?.startValue === right?.startValue &&
        left?.endValue === right?.endValue
    );
}

function toFiniteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}