import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatMemberTooltipContent } from "../charts/timeseries";
import { parseSeriesId } from "../core/seriesId";
import { formatCompactTooltip } from "../core/tooltip";

type ZrMouseEvent = {
    offsetX?: number;
    offsetY?: number;
};

export type HoveredMemberInfo = {
    memberId: number;
    groupKey: string;
};

type MemberSeriesMeta = {
    axisIndex: number;
    color?: string;
    groupKey: string;
    memberId: string;
    seriesIndex: number;
    seriesName: string;
    values: number[];
    xValues: number[];
};

type ResolvedTarget = {
    member: MemberSeriesMeta;
    dataIndex: number;
    matchingSeriesIndices: number[];
};

type MemberInteractionIndex = {
    matchingSeriesIndicesByMemberKey: Map<string, number[]>;
    seriesByAxisIndex: Map<number, MemberSeriesMeta[]>;
};

type TooltipTriggerOn = "none" | "click" | "mousemove" | "mousemove|click";

export type MemberInteractionOptions = {
    onHoveredMemberChange?: (info: HoveredMemberInfo | null) => void;
    externalHoveredMember?: HoveredMemberInfo | null;
    memberLabel?: string;
    timestamps?: number[];
};

export type MemberInteractionEvents = {
    mouseout: () => void;
    globalout: () => void;
};

/**
 * Unified hook for member-series interaction: closest-member tooltip + cross-subplot highlighting.
 *
 * Uses ZR-level mousemove to find the member series closest to the cursor (by Y distance),
 * then atomically highlights that member across all subplots and shows a tooltip for it.
 * This guarantees tooltip and highlight always agree on which member is active.
 *
 * When timestamps are not provided (e.g. scatter charts), highlighting still works
 * but closest-Y tooltip snapping is disabled.
 */
export function useMemberInteraction(
    chartRef: React.RefObject<ReactECharts | null>,
    enabled: boolean,
    layoutDependency: unknown,
    options: MemberInteractionOptions = {},
): MemberInteractionEvents {
    const onHoveredMemberChange = options.onHoveredMemberChange;
    const externalHoveredMember = options.externalHoveredMember;
    const memberLabel = options.memberLabel;
    const timestamps = options.timestamps;

    const timestampsRef = React.useRef(timestamps);
    timestampsRef.current = timestamps;

    const lastTargetKeyRef = React.useRef<string | null>(null);
    const lastReportedMemberRef = React.useRef<string | null>(null);
    const highlightedSeriesIndicesRef = React.useRef<number[]>([]);
    const rafIdRef = React.useRef<number | null>(null);

    const clearAll = React.useCallback(
        function clearAllInteraction() {
            const chart = chartRef.current;
            if (!chart) return;

            const instance = chart.getEchartsInstance();
            instance.dispatchAction({ type: "downplay" });
            instance.dispatchAction({ type: "hideTip" });
            instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });

            lastTargetKeyRef.current = null;
            clearHighlightedSeries(instance, highlightedSeriesIndicesRef);

            if (lastReportedMemberRef.current !== null) {
                lastReportedMemberRef.current = null;
                onHoveredMemberChange?.(null);
            }
        },
        [chartRef, onHoveredMemberChange],
    );

    // Main effect: attach ZR-level mousemove for closest-member resolution
    React.useEffect(
        function manageMemberInteractionEffect() {
            const chart = chartRef.current;
            if (!chart || !enabled) return;

            const instance = chart.getEchartsInstance();

            const interactionIndex = buildMemberInteractionIndex(instance);
            if (interactionIndex.seriesByAxisIndex.size === 0) return;

            // Take over tooltip so the hook controls it atomically with highlighting
            const originalTriggerOn = readTooltipTriggerOn(instance);
            disableDefaultTooltipTrigger(instance);

            const zr = instance.getZr();

            function onMouseMove(event: ZrMouseEvent) {
                if (rafIdRef.current != null) return;
                rafIdRef.current = requestAnimationFrame(() => {
                    rafIdRef.current = null;
                    handlePointerMove(
                        event,
                        instance,
                        interactionIndex,
                        timestampsRef.current,
                        memberLabel,
                        lastTargetKeyRef,
                        lastReportedMemberRef,
                        highlightedSeriesIndicesRef,
                        onHoveredMemberChange,
                    );
                });
            }

            function onGlobalOut() {
                cancelRaf();
                clearAllFromInstance(
                    instance,
                    lastTargetKeyRef,
                    lastReportedMemberRef,
                    highlightedSeriesIndicesRef,
                    onHoveredMemberChange,
                );
            }

            zr.on("mousemove", onMouseMove);
            zr.on("globalout", onGlobalOut);

            function cancelRaf() {
                if (rafIdRef.current != null) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }
            }

            return function cleanupMemberInteraction() {
                zr.off("mousemove", onMouseMove);
                zr.off("globalout", onGlobalOut);
                cancelRaf();
                clearAllFromInstance(
                    instance,
                    lastTargetKeyRef,
                    lastReportedMemberRef,
                    highlightedSeriesIndicesRef,
                    onHoveredMemberChange,
                );
                restoreTooltipTriggerOn(instance, originalTriggerOn);
            };
        },
        [chartRef, enabled, layoutDependency, memberLabel, onHoveredMemberChange, clearAll],
    );

    // External hover: highlight a member driven from outside state
    React.useEffect(
        function applyExternalHoverEffect() {
            if (!enabled || !chartRef.current || !externalHoveredMember) return;

            const instance = chartRef.current.getEchartsInstance();
            const interactionIndex = buildMemberInteractionIndex(instance);
            const actions = getMatchingMemberIndices(
                interactionIndex,
                String(externalHoveredMember.memberId),
                externalHoveredMember.groupKey,
            );
            if (actions.length === 0) return;

            clearHighlightedSeries(instance, highlightedSeriesIndicesRef);
            for (const seriesIndex of actions) {
                instance.dispatchAction({ type: "highlight", seriesIndex });
            }
            highlightedSeriesIndicesRef.current = actions;
            lastTargetKeyRef.current = `external:${externalHoveredMember.groupKey}:${externalHoveredMember.memberId}`;
        },
        [enabled, chartRef, externalHoveredMember],
    );

    // External hover clear
    React.useEffect(
        function clearExternalHoverEffect() {
            if (externalHoveredMember === null && lastTargetKeyRef.current?.startsWith("external:")) {
                clearAll();
            }
        },
        [externalHoveredMember, clearAll],
    );

    // Cleanup rAF on unmount
    React.useEffect(
        () => () => {
            if (rafIdRef.current != null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        },
        [],
    );

    return React.useMemo(
        () => ({
            mouseout: () => {
                // Intentional no-op: globalout on ZR handles cleanup.
                // mouseout fires on element boundaries within the chart,
                // which would cause flicker if we cleared here.
            },
            globalout: () => {
                clearAll();
            },
        }),
        [clearAll],
    );
}

// ---------------------------------------------------------------------------
// Core pointer-move handler
// ---------------------------------------------------------------------------

function handlePointerMove(
    event: ZrMouseEvent,
    instance: ECharts,
    interactionIndex: MemberInteractionIndex,
    timestamps: number[] | undefined,
    memberLabel: string | undefined,
    lastTargetKeyRef: React.MutableRefObject<string | null>,
    lastReportedMemberRef: React.MutableRefObject<string | null>,
    highlightedSeriesIndicesRef: React.MutableRefObject<number[]>,
    onHoveredMemberChange: ((info: HoveredMemberInfo | null) => void) | undefined,
): void {
    const pixelX = typeof event.offsetX === "number" ? event.offsetX : null;
    const pixelY = typeof event.offsetY === "number" ? event.offsetY : null;

    if (pixelX == null || pixelY == null) {
        clearAllFromInstance(
            instance,
            lastTargetKeyRef,
            lastReportedMemberRef,
            highlightedSeriesIndicesRef,
            onHoveredMemberChange,
        );
        return;
    }

    const target = resolveClosestMember(instance, interactionIndex, pixelX, pixelY, timestamps?.length ?? 0);
    if (!target) {
        clearAllFromInstance(
            instance,
            lastTargetKeyRef,
            lastReportedMemberRef,
            highlightedSeriesIndicesRef,
            onHoveredMemberChange,
        );
        return;
    }

    const targetKey = `${target.member.groupKey}:${target.member.memberId}:${target.dataIndex}`;
    if (lastTargetKeyRef.current === targetKey) return;
    lastTargetKeyRef.current = targetKey;

    // Highlight across all subplots
    clearHighlightedSeries(instance, highlightedSeriesIndicesRef);
    for (const seriesIndex of target.matchingSeriesIndices) {
        instance.dispatchAction({ type: "highlight", seriesIndex });
    }
    highlightedSeriesIndicesRef.current = target.matchingSeriesIndices;

    // Show tooltip
    if (timestamps && timestamps.length > 0) {
        instance.dispatchAction({
            type: "updateAxisPointer",
            currTrigger: "mousemove",
            x: pixelX,
            y: pixelY,
        });

        instance.dispatchAction({
            type: "showTip",
            x: pixelX,
            y: pixelY,
            tooltip: {
                content: formatMemberTooltipContent({
                    axisValue: timestampUtcMsToCompactIsoString(timestamps[target.dataIndex]),
                    seriesName: target.member.seriesName,
                    memberId: target.member.memberId,
                    value: target.member.values[target.dataIndex],
                    color: target.member.color,
                    memberLabel,
                }),
            },
        });
    } else {
        instance.dispatchAction({
            type: "showTip",
            x: pixelX,
            y: pixelY,
            tooltip: {
                content: formatScatterTooltipContent(target.member, memberLabel),
            },
        });
    }

    // Report hovered member change
    const memberKey = `${target.member.groupKey}:${target.member.memberId}`;
    if (lastReportedMemberRef.current !== memberKey) {
        lastReportedMemberRef.current = memberKey;
        onHoveredMemberChange?.({
            memberId: Number(target.member.memberId),
            groupKey: target.member.groupKey,
        });
    }
}

function clearAllFromInstance(
    instance: ECharts,
    lastTargetKeyRef: React.MutableRefObject<string | null>,
    lastReportedMemberRef: React.MutableRefObject<string | null>,
    highlightedSeriesIndicesRef: React.MutableRefObject<number[]>,
    onHoveredMemberChange: ((info: HoveredMemberInfo | null) => void) | undefined,
): void {
    clearHighlightedSeries(instance, highlightedSeriesIndicesRef);
    instance.dispatchAction({ type: "hideTip" });
    instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });

    lastTargetKeyRef.current = null;

    if (lastReportedMemberRef.current !== null) {
        lastReportedMemberRef.current = null;
        onHoveredMemberChange?.(null);
    }
}

function clearHighlightedSeries(
    instance: ECharts,
    highlightedSeriesIndicesRef: React.MutableRefObject<number[]>,
): void {
    for (const seriesIndex of highlightedSeriesIndicesRef.current) {
        instance.dispatchAction({ type: "downplay", seriesIndex });
    }
    highlightedSeriesIndicesRef.current = [];
}

// ---------------------------------------------------------------------------
// Closest-member resolution
// ---------------------------------------------------------------------------

function resolveClosestMember(
    instance: ECharts,
    interactionIndex: MemberInteractionIndex,
    pixelX: number,
    pixelY: number,
    timestampCount: number,
): ResolvedTarget | null {
    for (const [axisIndex, series] of interactionIndex.seriesByAxisIndex.entries()) {
        if (!instance.containPixel({ gridIndex: axisIndex }, [pixelX, pixelY])) {
            continue;
        }

        const dataPoint = instance.convertFromPixel({ gridIndex: axisIndex }, [pixelX, pixelY]);
        if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
            continue;
        }

        if (timestampCount > 0) {
            // Timeseries mode: snap to closest category index, then find closest Y
            const categoryIndex = Math.round(Number(dataPoint[0]));
            const cursorValue = Number(dataPoint[1]);
            if (!Number.isFinite(categoryIndex) || !Number.isFinite(cursorValue)) {
                continue;
            }
            if (categoryIndex < 0 || categoryIndex >= timestampCount) {
                continue;
            }

            const closest = findClosestMember(series, categoryIndex, cursorValue);
            if (!closest) continue;

            return {
                member: closest,
                dataIndex: categoryIndex,
                matchingSeriesIndices: getMatchingMemberIndices(interactionIndex, closest.memberId, closest.groupKey),
            };
        } else {
            // Scatter mode: find closest point by pixel distance
            const closest = findClosestScatterMember(instance, series, axisIndex, pixelX, pixelY);
            if (!closest) continue;

            return {
                member: closest,
                dataIndex: 0,
                matchingSeriesIndices: getMatchingMemberIndices(interactionIndex, closest.memberId, closest.groupKey),
            };
        }
    }

    return null;
}

export function findClosestMember(
    series: MemberSeriesMeta[],
    categoryIndex: number,
    cursorValue: number,
): MemberSeriesMeta | null {
    let closest: MemberSeriesMeta | null = null;
    let minDistance = Infinity;

    for (const candidate of series) {
        const value = candidate.values[categoryIndex];
        if (!Number.isFinite(value)) continue;

        const distance = Math.abs(value - cursorValue);
        if (distance < minDistance) {
            minDistance = distance;
            closest = candidate;
        }
    }

    return closest;
}

function findClosestScatterMember(
    instance: ECharts,
    series: MemberSeriesMeta[],
    gridIndex: number,
    pixelX: number,
    pixelY: number,
): MemberSeriesMeta | null {
    let closest: MemberSeriesMeta | null = null;
    let minDistSq = Infinity;

    for (const candidate of series) {
        if (candidate.xValues.length === 0 || candidate.values.length === 0) continue;

        const pointPixel = instance.convertToPixel({ gridIndex }, [candidate.xValues[0], candidate.values[0]]);
        if (!Array.isArray(pointPixel)) continue;

        const dx = pointPixel[0] - pixelX;
        const dy = pointPixel[1] - pixelY;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
            minDistSq = distSq;
            closest = candidate;
        }
    }

    return closest;
}

// ---------------------------------------------------------------------------
// Series index building & lookup
// ---------------------------------------------------------------------------

function buildMemberInteractionIndex(instance: ECharts): MemberInteractionIndex {
    const seriesByAxisIndex = new Map<number, MemberSeriesMeta[]>();
    const matchingSeriesIndicesByMemberKey = new Map<string, number[]>();
    const optionSeries = instance.getOption()?.series;
    if (!Array.isArray(optionSeries)) {
        return { matchingSeriesIndicesByMemberKey, seriesByAxisIndex };
    }

    optionSeries.forEach(
        (
            seriesOption: {
                color?: unknown;
                data?: unknown;
                id?: unknown;
                itemStyle?: unknown;
                lineStyle?: unknown;
                name?: unknown;
                xAxisIndex?: unknown;
            },
            seriesIndex: number,
        ) => {
            const id = typeof seriesOption.id === "string" ? seriesOption.id : null;
            if (!id) return;

            const parsed = parseSeriesId(id);
            if (!parsed || parsed.role !== "member") return;
            if (!parsed.subKey) return;

            const axisIndex =
                typeof seriesOption.xAxisIndex === "number" && Number.isFinite(seriesOption.xAxisIndex)
                    ? seriesOption.xAxisIndex
                    : 0;
            const values = extractSeriesValues(seriesOption.data);
            const xValues = extractSeriesXValues(seriesOption.data);

            if (values.length === 0) return;

            const memberSeriesMeta = {
                axisIndex,
                color: resolveSeriesColor(seriesOption),
                groupKey: parsed.name,
                memberId: parsed.subKey,
                seriesIndex,
                seriesName: typeof seriesOption.name === "string" ? seriesOption.name : "",
                values,
                xValues,
            };

            const axisBucket = seriesByAxisIndex.get(axisIndex) ?? [];
            axisBucket.push(memberSeriesMeta);
            seriesByAxisIndex.set(axisIndex, axisBucket);

            const memberKey = makeMemberLookupKey(parsed.name, parsed.subKey);
            const seriesIndices = matchingSeriesIndicesByMemberKey.get(memberKey) ?? [];
            seriesIndices.push(seriesIndex);
            matchingSeriesIndicesByMemberKey.set(memberKey, seriesIndices);
        },
    );

    return { matchingSeriesIndicesByMemberKey, seriesByAxisIndex };
}

function getMatchingMemberIndices(
    interactionIndex: MemberInteractionIndex,
    targetMemberKey: string,
    targetGroupKey: string,
): number[] {
    return interactionIndex.matchingSeriesIndicesByMemberKey.get(
        makeMemberLookupKey(targetGroupKey, targetMemberKey),
    ) ?? [];
}

function makeMemberLookupKey(groupKey: string, memberId: string): string {
    return `${groupKey}:${memberId}`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function extractSeriesValues(data: unknown): number[] {
    if (!Array.isArray(data)) return [];

    return data.map(function extractValue(entry) {
        if (typeof entry === "number") return entry;
        if (Array.isArray(entry)) return Number(entry[entry.length - 1]);
        if (entry && typeof entry === "object" && "value" in entry) {
            const value = (entry as { value?: unknown }).value;
            if (typeof value === "number") return value;
            if (Array.isArray(value)) return Number(value[value.length - 1]);
        }
        return Number.NaN;
    });
}

function extractSeriesXValues(data: unknown): number[] {
    if (!Array.isArray(data)) return [];

    return data.map(function extractXValue(entry) {
        if (Array.isArray(entry) && entry.length >= 2) return Number(entry[0]);
        if (entry && typeof entry === "object" && "value" in entry) {
            const value = (entry as { value?: unknown }).value;
            if (Array.isArray(value) && value.length >= 2) return Number(value[0]);
        }
        return Number.NaN;
    });
}

function resolveSeriesColor(seriesOption: {
    color?: unknown;
    itemStyle?: unknown;
    lineStyle?: unknown;
}): string | undefined {
    const itemStyleColor =
        seriesOption.itemStyle && typeof seriesOption.itemStyle === "object" && "color" in seriesOption.itemStyle
            ? (seriesOption.itemStyle as { color?: unknown }).color
            : undefined;
    if (typeof itemStyleColor === "string") return itemStyleColor;

    const lineStyleColor =
        seriesOption.lineStyle && typeof seriesOption.lineStyle === "object" && "color" in seriesOption.lineStyle
            ? (seriesOption.lineStyle as { color?: unknown }).color
            : undefined;
    if (typeof lineStyleColor === "string") return lineStyleColor;

    return typeof seriesOption.color === "string" ? seriesOption.color : undefined;
}

function formatScatterTooltipContent(member: MemberSeriesMeta, memberLabel: string | undefined): string {
    const label = memberLabel ?? "Member";
    const x = member.xValues[0];
    const y = member.values[0];

    return formatCompactTooltip(member.seriesName, [
        { label: "X", value: formatNumber(x) },
        { label: "Y", value: formatNumber(y) },
        { label: `${label} ${member.memberId}`, value: "", color: member.color },
    ]);
}

function disableDefaultTooltipTrigger(instance: ECharts): void {
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
    instance.setOption({ tooltip: { triggerOn } });
}

function isTooltipTriggerOn(value: unknown): value is TooltipTriggerOn {
    return value === "none" || value === "click" || value === "mousemove" || value === "mousemove|click";
}
