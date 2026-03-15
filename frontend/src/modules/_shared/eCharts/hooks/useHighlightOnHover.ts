import React from "react";

import type { ECharts } from "echarts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import type ReactECharts from "echarts-for-react";

import { getHighlightGroupKey, getRealizationId, isRealizationSeries } from "../utils/seriesId";

export type HoveredRealizationInfo = {
    realizationId: number;
    groupKey: string;
};

export type HighlightOnHoverOptions = {
    /** Called when the hovered realization changes (null = nothing hovered). */
    onHoveredRealizationChange?: (info: HoveredRealizationInfo | null) => void;
    /** Externally-driven highlighted realization (e.g. from another module via synced settings). */
    externalHoveredRealization?: HoveredRealizationInfo | null;
};

export type HighlightOnHoverEvents = {
    mousemove: (event: ECElementEvent) => void;
    mouseover: (event: ECElementEvent) => void;
    mouseout: () => void;
    globalout: () => void;
};

export function useHighlightOnHover(
    chartRef: React.RefObject<ReactECharts | null>,
    enabled: boolean,
    options?: HighlightOnHoverOptions,
): HighlightOnHoverEvents {
    const onHoveredRealizationChange = options?.onHoveredRealizationChange;
    const externalHoveredRealization = options?.externalHoveredRealization;

    const highlightedSeriesRef = React.useRef<string | null>(null);
    const clearHighlightTimeoutRef = React.useRef<number | null>(null);
    const lastReportedRealizationRef = React.useRef<string | null>(null);

    const cancelScheduledClear = React.useCallback(() => {
        if (clearHighlightTimeoutRef.current != null) {
            window.clearTimeout(clearHighlightTimeoutRef.current);
            clearHighlightTimeoutRef.current = null;
        }
    }, []);

    const clearHighlight = React.useCallback(() => {
        if (!enabled || !chartRef.current) return;

        chartRef.current.getEchartsInstance().dispatchAction({ type: "downplay" });
        highlightedSeriesRef.current = null;

        if (lastReportedRealizationRef.current !== null) {
            lastReportedRealizationRef.current = null;
            onHoveredRealizationChange?.(null);
        }
    }, [enabled, chartRef, onHoveredRealizationChange]);

    const applyHighlight = React.useCallback(
        (event: ECElementEvent) => {
            if (!enabled || !chartRef.current) return;

            cancelScheduledClear();

            const instance = chartRef.current.getEchartsInstance();
            const highlightTarget = getHighlightTarget(instance, event);
            if (!highlightTarget) return;

            if (highlightedSeriesRef.current !== highlightTarget.key) {
                instance.dispatchAction({ type: "downplay" });

                for (const action of highlightTarget.actions) {
                    instance.dispatchAction({ type: "highlight", ...action });
                }

                highlightedSeriesRef.current = highlightTarget.key;

                // Report realization change to consumer
                const realizationInfo = highlightTarget.realizationInfo;
                const infoKey = realizationInfo
                    ? `${realizationInfo.groupKey}:${realizationInfo.realizationId}`
                    : null;
                if (lastReportedRealizationRef.current !== infoKey) {
                    lastReportedRealizationRef.current = infoKey;
                    onHoveredRealizationChange?.(realizationInfo);
                }
            }
        },
        [enabled, chartRef, cancelScheduledClear, onHoveredRealizationChange],
    );

    // Apply external highlight when externally-driven realization changes
    React.useEffect(() => {
        if (!enabled || !chartRef.current || !externalHoveredRealization) return;

        const instance = chartRef.current.getEchartsInstance();
        const actions = findRealizationSeriesByIdAndGroup(
            instance,
            String(externalHoveredRealization.realizationId),
            externalHoveredRealization.groupKey,
        );
        if (actions.length === 0) return;

        instance.dispatchAction({ type: "downplay" });
        for (const action of actions) {
            instance.dispatchAction({ type: "highlight", ...action });
        }
        highlightedSeriesRef.current = `external:${externalHoveredRealization.groupKey}:${externalHoveredRealization.realizationId}`;
    }, [enabled, chartRef, externalHoveredRealization]);

    // Clear external highlight when it becomes null
    React.useEffect(() => {
        if (externalHoveredRealization === null && highlightedSeriesRef.current?.startsWith("external:")) {
            clearHighlight();
        }
    }, [externalHoveredRealization, clearHighlight]);

    React.useEffect(
        () => () => {
            cancelScheduledClear();
        },
        [cancelScheduledClear],
    );

    return React.useMemo(
        () => ({
            mousemove: applyHighlight,
            mouseover: applyHighlight,
            mouseout: () => {
                if (!enabled) return;

                cancelScheduledClear();
                clearHighlightTimeoutRef.current = window.setTimeout(() => {
                    clearHighlight();
                    clearHighlightTimeoutRef.current = null;
                }, 0);
            },
            globalout: () => {
                cancelScheduledClear();
                clearHighlight();
            },
        }),
        [enabled, applyHighlight, cancelScheduledClear, clearHighlight],
    );
}

type HighlightTarget = {
    key: string;
    actions: Array<{ seriesIndex: number } | { seriesId: string } | { seriesName: string }>;
    realizationInfo: HoveredRealizationInfo | null;
};

function getHighlightTarget(instance: ECharts, event: ECElementEvent): HighlightTarget | null {
    const hoveredSeriesId = resolveHoveredSeriesId(instance, event);

    if (hoveredSeriesId) {
        const linkedSeries = findLinkedRealizationSeries(instance, hoveredSeriesId);
        if (linkedSeries.length > 0) {
            const realId = getRealizationId(hoveredSeriesId);
            const groupKey = getHighlightGroupKey(hoveredSeriesId);
            const realizationInfo =
                realId != null && groupKey != null
                    ? { realizationId: Number(realId), groupKey }
                    : null;
            return { key: `linked:${hoveredSeriesId}`, actions: linkedSeries, realizationInfo };
        }
    }

    if (typeof event?.seriesIndex === "number") {
        return { key: `index:${event.seriesIndex}`, actions: [{ seriesIndex: event.seriesIndex }], realizationInfo: null };
    }

    if (hoveredSeriesId) {
        return { key: `id:${hoveredSeriesId}`, actions: [{ seriesId: hoveredSeriesId }], realizationInfo: null };
    }

    if (typeof event?.seriesName === "string") {
        return { key: `name:${event.seriesName}`, actions: [{ seriesName: event.seriesName }], realizationInfo: null };
    }

    return null;
}

function resolveHoveredSeriesId(instance: ECharts, event: ECElementEvent): string | null {
    if (typeof event?.seriesId === "string") {
        return event.seriesId;
    }

    if (typeof event?.seriesIndex !== "number") {
        return null;
    }

    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) {
        return null;
    }

    const hoveredSeries = chartSeries[event.seriesIndex];
    return typeof hoveredSeries?.id === "string" ? hoveredSeries.id : null;
}

function findLinkedRealizationSeries(instance: ECharts, hoveredSeriesId: string): Array<{ seriesIndex: number }> {
    if (!isRealizationSeries(hoveredSeriesId)) return [];

    const groupKey = getHighlightGroupKey(hoveredSeriesId);
    const realId = getRealizationId(hoveredSeriesId);
    if (!groupKey || realId == null) return [];

    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) return [];

    const actions: Array<{ seriesIndex: number }> = [];

    chartSeries.forEach((seriesOption: { id?: unknown }, seriesIndex: number) => {
        const seriesId = typeof seriesOption?.id === "string" ? seriesOption.id : null;
        if (!seriesId || !isRealizationSeries(seriesId)) return;

        const candidateGroupKey = getHighlightGroupKey(seriesId);
        const candidateRealId = getRealizationId(seriesId);

        if (candidateGroupKey === groupKey && candidateRealId === realId) {
            actions.push({ seriesIndex });
        }
    });

    return actions;
}

function findRealizationSeriesByIdAndGroup(
    instance: ECharts,
    realizationId: string,
    groupKey: string,
): Array<{ seriesIndex: number }> {
    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) return [];

    const actions: Array<{ seriesIndex: number }> = [];

    chartSeries.forEach((seriesOption: { id?: unknown }, seriesIndex: number) => {
        const seriesId = typeof seriesOption?.id === "string" ? seriesOption.id : null;
        if (!seriesId || !isRealizationSeries(seriesId)) return;

        const candidateGroupKey = getHighlightGroupKey(seriesId);
        const candidateRealId = getRealizationId(seriesId);

        if (candidateGroupKey === groupKey && candidateRealId === realizationId) {
            actions.push({ seriesIndex });
        }
    });

    return actions;
}
