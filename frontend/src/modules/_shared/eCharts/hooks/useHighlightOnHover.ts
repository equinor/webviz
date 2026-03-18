import React from "react";

import type { ECharts } from "echarts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import type ReactECharts from "echarts-for-react";

import { getSeriesLinkGroupKey, getSeriesMemberKey, isMemberSeries } from "../utils/seriesMetadata";

type SeriesOptionLike = { id?: unknown; webvizSeriesMeta?: unknown };

export type HoveredMemberInfo = {
    memberId: number;
    groupKey: string;
};

export type HighlightOnHoverOptions = {
    /** Called when the hovered member changes (null = nothing hovered). */
    onHoveredMemberChange?: (info: HoveredMemberInfo | null) => void;
    /** Externally-driven highlighted member (e.g. from another module via synced settings). */
    externalHoveredMember?: HoveredMemberInfo | null;
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
    const onHoveredMemberChange = options?.onHoveredMemberChange;
    const externalHoveredMember = options?.externalHoveredMember;

    const highlightedSeriesRef = React.useRef<string | null>(null);
    const clearHighlightTimeoutRef = React.useRef<number | null>(null);
    const lastReportedMemberRef = React.useRef<string | null>(null);

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

        if (lastReportedMemberRef.current !== null) {
            lastReportedMemberRef.current = null;
            onHoveredMemberChange?.(null);
        }
    }, [enabled, chartRef, onHoveredMemberChange]);

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

                const memberInfo = highlightTarget.memberInfo;
                const infoKey = memberInfo ? `${memberInfo.groupKey}:${memberInfo.memberId}` : null;
                if (lastReportedMemberRef.current !== infoKey) {
                    lastReportedMemberRef.current = infoKey;
                    onHoveredMemberChange?.(memberInfo);
                }
            }
        },
        [enabled, chartRef, cancelScheduledClear, onHoveredMemberChange],
    );

    React.useEffect(() => {
        if (!enabled || !chartRef.current || !externalHoveredMember) return;

        const instance = chartRef.current.getEchartsInstance();
        const actions = findMemberSeriesByIdAndGroup(
            instance,
            String(externalHoveredMember.memberId),
            externalHoveredMember.groupKey,
        );
        if (actions.length === 0) return;

        instance.dispatchAction({ type: "downplay" });
        for (const action of actions) {
            instance.dispatchAction({ type: "highlight", ...action });
        }
        highlightedSeriesRef.current = `external:${externalHoveredMember.groupKey}:${externalHoveredMember.memberId}`;
    }, [enabled, chartRef, externalHoveredMember]);

    React.useEffect(() => {
        if (externalHoveredMember === null && highlightedSeriesRef.current?.startsWith("external:")) {
            clearHighlight();
        }
    }, [externalHoveredMember, clearHighlight]);

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
    memberInfo: HoveredMemberInfo | null;
};

function getHighlightTarget(instance: ECharts, event: ECElementEvent): HighlightTarget | null {
    const hoveredSeries = resolveHoveredSeries(instance, event);

    if (hoveredSeries.option && isMemberSeries(hoveredSeries.option)) {
        const linkedSeries = findLinkedMemberSeries(instance, hoveredSeries.option);
        if (linkedSeries.length > 0) {
            const memberId = getSeriesMemberKey(hoveredSeries.option);
            const groupKey = getSeriesLinkGroupKey(hoveredSeries.option);
            const memberInfo = memberId != null && groupKey != null ? { memberId: Number(memberId), groupKey } : null;
            const highlightKey = hoveredSeries.id ?? hoveredSeries.index ?? "member";
            return { key: `linked:${highlightKey}`, actions: linkedSeries, memberInfo };
        }
    }

    if (typeof hoveredSeries.index === "number") {
        return {
            key: `index:${hoveredSeries.index}`,
            actions: [{ seriesIndex: hoveredSeries.index }],
            memberInfo: null,
        };
    }

    if (hoveredSeries.id) {
        return { key: `id:${hoveredSeries.id}`, actions: [{ seriesId: hoveredSeries.id }], memberInfo: null };
    }

    if (typeof event?.seriesName === "string") {
        return { key: `name:${event.seriesName}`, actions: [{ seriesName: event.seriesName }], memberInfo: null };
    }

    return null;
}

function resolveHoveredSeries(
    instance: ECharts,
    event: ECElementEvent,
): { id: string | null; index: number | null; option: SeriesOptionLike | null } {
    let seriesId = typeof event?.seriesId === "string" ? event.seriesId : null;
    let seriesIndex = typeof event?.seriesIndex === "number" ? event.seriesIndex : null;
    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) {
        return { id: seriesId, index: seriesIndex, option: null };
    }

    let hoveredSeries: SeriesOptionLike | null = null;
    if (seriesIndex != null) {
        hoveredSeries = chartSeries[seriesIndex] as SeriesOptionLike;
    } else if (seriesId) {
        const matchedIndex = chartSeries.findIndex((seriesOption) => typeof seriesOption?.id === "string" && seriesOption.id === seriesId);
        if (matchedIndex >= 0) {
            seriesIndex = matchedIndex;
            hoveredSeries = chartSeries[matchedIndex] as SeriesOptionLike;
        }
    }

    if (hoveredSeries && !seriesId && typeof hoveredSeries.id === "string") {
        seriesId = hoveredSeries.id;
    }

    return { id: seriesId, index: seriesIndex, option: hoveredSeries };
}

function findLinkedMemberSeries(instance: ECharts, hoveredSeries: SeriesOptionLike): Array<{ seriesIndex: number }> {
    if (!isMemberSeries(hoveredSeries)) return [];

    const groupKey = getSeriesLinkGroupKey(hoveredSeries);
    const memberId = getSeriesMemberKey(hoveredSeries);
    if (!groupKey || memberId == null) return [];

    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) return [];

    const actions: Array<{ seriesIndex: number }> = [];

    chartSeries.forEach((seriesOption: { id?: unknown; webvizSeriesMeta?: unknown }, seriesIndex: number) => {
        if (!isMemberSeries(seriesOption)) return;

        const candidateGroupKey = getSeriesLinkGroupKey(seriesOption);
        const candidateMemberId = getSeriesMemberKey(seriesOption);

        if (candidateGroupKey === groupKey && candidateMemberId === memberId) {
            actions.push({ seriesIndex });
        }
    });

    return actions;
}

function findMemberSeriesByIdAndGroup(
    instance: ECharts,
    memberId: string,
    groupKey: string,
): Array<{ seriesIndex: number }> {
    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) return [];

    const actions: Array<{ seriesIndex: number }> = [];

    chartSeries.forEach((seriesOption: { id?: unknown; webvizSeriesMeta?: unknown }, seriesIndex: number) => {
        if (!isMemberSeries(seriesOption)) return;

        const candidateGroupKey = getSeriesLinkGroupKey(seriesOption);
        const candidateMemberId = getSeriesMemberKey(seriesOption);

        if (candidateGroupKey === groupKey && candidateMemberId === memberId) {
            actions.push({ seriesIndex });
        }
    });

    return actions;
}
