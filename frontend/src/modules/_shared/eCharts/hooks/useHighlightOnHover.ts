import React from "react";

import type { ECharts } from "echarts";
import type { ECElementEvent } from "echarts/types/dist/shared";
import type ReactECharts from "echarts-for-react";

import { parseSeriesId } from "../core/seriesId";

export type HoveredMemberInfo = {
    memberId: number;
    groupKey: string;
};

export type HighlightOnHoverOptions = {
    onHoveredMemberChange?: (info: HoveredMemberInfo | null) => void;
    externalHoveredMember?: HoveredMemberInfo | null;
};

export type HighlightOnHoverEvents = {
    mousemove: (event: ECElementEvent) => void;
    mouseover: (event: ECElementEvent) => void;
    mouseout: () => void;
    globalout: () => void;
};

type HighlightTarget = {
    key: string;
    actions: Array<{ seriesId: string } | { seriesIndex: number } | { seriesName: string }>;
    memberInfo: HoveredMemberInfo | null;
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
        const actions = findMatchingMemberActions(
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
function getHighlightTarget(instance: ECharts, event: ECElementEvent): HighlightTarget | null {
    let seriesId = typeof event?.seriesId === "string" ? event.seriesId : null;
    const seriesIndex = typeof event?.seriesIndex === "number" ? event.seriesIndex : null;


    if (!seriesId && seriesIndex != null) {
        const chartSeries = instance.getOption()?.series;
        if (Array.isArray(chartSeries) && chartSeries[seriesIndex]) {
            const idFromOption = (chartSeries[seriesIndex] as { id?: string }).id;
            if (typeof idFromOption === "string") {
                seriesId = idFromOption;
            }
        }
    }

    if (seriesId) {
        const memberData = parseMemberId(seriesId);
        if (memberData) {
            const actions = findMatchingMemberActions(instance, memberData.memberKey, memberData.groupKey);
            if (actions.length > 0) {
                const memberInfo = { memberId: Number(memberData.memberKey), groupKey: memberData.groupKey };
                return { key: `linked:${seriesId}`, actions, memberInfo };
            }
        }
        return { key: `id:${seriesId}`, actions: [{ seriesId }], memberInfo: null };
    }

    if (seriesIndex != null) {
        return { key: `index:${seriesIndex}`, actions: [{ seriesIndex }], memberInfo: null };
    }

    if (typeof event?.seriesName === "string") {
        return { key: `name:${event.seriesName}`, actions: [{ seriesName: event.seriesName }], memberInfo: null };
    }

    return null;
}

function findMatchingMemberActions(instance: ECharts, targetMemberKey: string, targetGroupKey: string) {
    const chartSeries = instance.getOption()?.series;
    if (!Array.isArray(chartSeries)) return [];

    const actions: Array<{ seriesIndex: number }> = [];

    chartSeries.forEach((seriesOption, seriesIndex) => {
        const id = (seriesOption as { id?: string }).id;
        if (typeof id !== "string") return;

        const memberData = parseMemberId(id);
        if (memberData && memberData.groupKey === targetGroupKey && memberData.memberKey === targetMemberKey) {
            actions.push({ seriesIndex });
        }
    });

    return actions;
}


function parseMemberId(seriesId: string): { groupKey: string; memberKey: string } | null {
    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.role !== "member") return null;

    return { groupKey: parsed.name, memberKey: parsed.subKey };
}   