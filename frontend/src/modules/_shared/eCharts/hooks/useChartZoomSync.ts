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

export function useChartZoomSync(
    zoomState: ChartZoomState,
    setZoomState: React.Dispatch<React.SetStateAction<ChartZoomState>>
) {
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const lastChartZoomStateRef = useRef<ChartZoomState | null>(null);

    const handleDataZoom = useCallback((params: DataZoomEvent) => {
        const updates = extractZoomUpdates(params);
        if (updates.length === 0) {
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            setZoomState((prev) => {
                const next = mergeZoomUpdates(prev, updates);
                lastChartZoomStateRef.current = next;
                return areZoomStatesEqual(prev, next) ? prev : next;
            });
        }, 150);
    }, [setZoomState]);

    useEffect(
        () => () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
        },
        [],
    );

    const appliedZoomState = useMemo(() => {
        if (lastChartZoomStateRef.current && areZoomStatesEqual(zoomState, lastChartZoomStateRef.current)) {
            return undefined;
        }

        return zoomState;
    }, [zoomState]);

    return { appliedZoomState, handleDataZoom };
}

function extractZoomUpdates(params: DataZoomEvent): Array<{ axisKey: "x" | "y"; zoom: AxisZoomState }> {
    const rawItems = Array.isArray(params.batch) ? params.batch : [params];
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