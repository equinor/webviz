import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../core/tooltip";
import type { HoveredSeriesInfo, InteractionSeries, InteractionSeriesEntry } from "../interaction";

type ZrMouseEvent = {
    offsetX?: number;
    offsetY?: number;
};

type InteractionEntry = InteractionSeriesEntry;

type InteractionIndex = InteractionSeries;

type ResolvedTarget = {
    entry: InteractionEntry;
    dataIndex: number;
    matchingSeriesIndices: number[];
};

const POINT_ANNOTATION_HOVER_RADIUS_PX = 10;
const POINT_ANNOTATION_HOVER_RADIUS_SQ = POINT_ANNOTATION_HOVER_RADIUS_PX * POINT_ANNOTATION_HOVER_RADIUS_PX;

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

    React.useEffect(
        function manageSeriesInteractionEffect() {
            const chart = chartRef.current;
            if (!chart || !enabled) return;

            const instance = chart.getEchartsInstance();

            const interactionIndex = interactionSeries;
            if (interactionIndex.seriesByAxisIndex.size === 0) return;

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
                    rafIdRef.current = requestAnimationFrame(() => {
                        rafIdRef.current = null;
                        handlePointerMove(
                            event,
                            currentInstance,
                            interactionIndex,
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

    React.useEffect(
        function applyExternalHoverEffect() {
            if (!enabled || !chartRef.current || !externalHoveredSeries) return;

            const instance = chartRef.current.getEchartsInstance();
            const actions = getMatchingSeriesIndices(interactionSeries, externalHoveredSeries.interactionKey);
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
            },
            globalout: () => {
                clearAll();
            },
        }),
        [clearAll],
    );
}

function handlePointerMove(
    event: ZrMouseEvent,
    instance: ECharts,
    interactionIndex: InteractionIndex,
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

    instance.dispatchAction({ type: "downplay" });
    for (const seriesIndex of target.matchingSeriesIndices) {
        instance.dispatchAction({ type: "highlight", seriesIndex });
    }

    if (interactionIndex.resolutionMode === "timeseries" && timestampUtcMs !== undefined) {
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
                content: formatTimeseriesTooltipContent(
                    target.entry,
                    hoveredSeriesInfo,
                    timestampUtcMs,
                    target.dataIndex,
                    formatSeriesLabel,
                ),
            },
        });
    } else {
        instance.dispatchAction({
            type: "showTip",
            x: pixelX,
            y: pixelY,
            tooltip: {
                content: formatScatterTooltipContent(target.entry, hoveredSeriesInfo, formatSeriesLabel),
            },
        });
    }

    if (lastReportedSeriesRef.current !== target.entry.interactionKey) {
        lastReportedSeriesRef.current = target.entry.interactionKey;
        onHoveredSeriesChange?.(hoveredSeriesInfo);
    }
}

function resolveTimeseriesTimestampUtcMs(
    interactionIndex: InteractionIndex,
    entry: InteractionEntry,
    dataIndex: number,
): number | undefined {
    if (interactionIndex.resolutionMode !== "timeseries") {
        return undefined;
    }

    const timestampUtcMs = entry.xValues[dataIndex];
    return Number.isFinite(timestampUtcMs) ? timestampUtcMs : undefined;
}

function clearAllFromInstance(
    instance: ECharts,
    lastTargetKeyRef: React.MutableRefObject<string | null>,
    lastReportedSeriesRef: React.MutableRefObject<string | null>,
    onHoveredSeriesChange: ((info: HoveredSeriesInfo | null) => void) | undefined,
): void {
    instance.dispatchAction({ type: "downplay" });
    instance.dispatchAction({ type: "hideTip" });
    instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });

    lastTargetKeyRef.current = null;

    if (lastReportedSeriesRef.current !== null) {
        lastReportedSeriesRef.current = null;
        onHoveredSeriesChange?.(null);
    }
}

function resolveClosestSeriesEntry(
    instance: ECharts,
    interactionIndex: InteractionIndex,
    pixelX: number,
    pixelY: number,
): ResolvedTarget | null {
    for (const [axisIndex, series] of interactionIndex.seriesByAxisIndex.entries()) {
        if (!instance.containPixel({ gridIndex: axisIndex }, [pixelX, pixelY])) {
            continue;
        }

        const dataPoint = instance.convertFromPixel({ gridIndex: axisIndex }, [pixelX, pixelY]);
        if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
            continue;
        }

        if (interactionIndex.resolutionMode === "timeseries") {
            const categoryIndex = Math.round(Number(dataPoint[0]));
            const cursorValue = Number(dataPoint[1]);
            if (!Number.isFinite(categoryIndex) || !Number.isFinite(cursorValue)) {
                continue;
            }
            if (series.length === 0 || categoryIndex < 0 || categoryIndex >= series[0].values.length) {
                continue;
            }

            const closestPointAnnotation = findClosestPointAnnotationEntry(
                instance,
                series,
                axisIndex,
                categoryIndex,
                pixelX,
                pixelY,
            );
            if (closestPointAnnotation) {
                return {
                    entry: closestPointAnnotation,
                    dataIndex: categoryIndex,
                    matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closestPointAnnotation.interactionKey),
                };
            }

            const closest = findClosestSeriesEntry(series, categoryIndex, cursorValue);
            if (!closest) continue;

            return {
                entry: closest,
                dataIndex: categoryIndex,
                matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closest.interactionKey),
            };
        }

        const closest = findClosestScatterSeriesEntry(instance, series, axisIndex, pixelX, pixelY);
        if (!closest) continue;

        return {
            entry: closest,
            dataIndex: 0,
            matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closest.interactionKey),
        };
    }

    return null;
}

function findClosestPointAnnotationEntry(
    instance: ECharts,
    series: InteractionEntry[],
    axisIndex: number,
    categoryIndex: number,
    pixelX: number,
    pixelY: number,
): InteractionEntry | null {
    let closest: InteractionEntry | null = null;
    let minDistSq = Infinity;

    for (const candidate of series) {
        if (candidate.kind !== "point-annotation") continue;

        const value = candidate.values[categoryIndex];
        if (!Number.isFinite(value)) continue;

        const pointPixel = instance.convertToPixel({ gridIndex: axisIndex }, [categoryIndex, value]);
        if (!Array.isArray(pointPixel)) continue;

        const dx = pointPixel[0] - pixelX;
        const dy = pointPixel[1] - pixelY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= POINT_ANNOTATION_HOVER_RADIUS_SQ && distSq < minDistSq) {
            minDistSq = distSq;
            closest = candidate;
        }
    }

    return closest;
}

export function findClosestSeriesEntry(
    series: InteractionEntry[],
    categoryIndex: number,
    cursorValue: number,
): InteractionEntry | null {
    let closest: InteractionEntry | null = null;
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

function findClosestScatterSeriesEntry(
    instance: ECharts,
    series: InteractionEntry[],
    gridIndex: number,
    pixelX: number,
    pixelY: number,
): InteractionEntry | null {
    let closest: InteractionEntry | null = null;
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

function getMatchingSeriesIndices(
    interactionIndex: InteractionIndex,
    interactionKey: string,
): number[] {
    return interactionIndex.matchingSeriesIndicesByKey.get(interactionKey) ?? [];
}

function formatScatterTooltipContent(
    entry: InteractionEntry,
    hoveredSeriesInfo: HoveredSeriesInfo,
    formatSeriesLabel: ((info: HoveredSeriesInfo) => string) | undefined,
): string {
    const x = entry.xValues[0];
    const y = entry.values[0];

    return formatCompactTooltip(entry.seriesName, [
        { label: "X", value: formatNumber(x) },
        { label: "Y", value: formatNumber(y) },
        {
            label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
            value: "",
            color: entry.color,
        },
    ]);
}

function formatTimeseriesTooltipContent(
    entry: InteractionEntry,
    hoveredSeriesInfo: HoveredSeriesInfo,
    timestampUtcMs: number,
    dataIndex: number,
    formatSeriesLabel: ((info: HoveredSeriesInfo) => string) | undefined,
): string {
    if (entry.kind === "member") {
        return formatCompactTooltip(timestampUtcMsToCompactIsoString(timestampUtcMs), [
            {
                label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
                value: formatNumber(entry.values[dataIndex]),
                color: entry.color,
            },
        ]);
    }

    if (entry.kind === "statistic") {
        return formatCompactTooltip(timestampUtcMsToCompactIsoString(timestampUtcMs), [
            {
                label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
                value: formatNumber(entry.values[dataIndex]),
                color: entry.color,
            },
        ]);
    }

    if (entry.kind === "reference-line") {
        return formatCompactTooltip(timestampUtcMsToCompactIsoString(timestampUtcMs), [
            {
                label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
                value: formatNumber(entry.values[dataIndex]),
                color: entry.color,
            },
        ]);
    }

    return formatCompactTooltip(timestampUtcMsToCompactIsoString(timestampUtcMs), [
        {
            label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
            value: `${formatNumber(entry.values[dataIndex])} +/- ${formatNumber(entry.annotationError)}`,
            color: entry.color,
        },
        ...(entry.annotationComment ? [{ label: "Comment", value: entry.annotationComment }] : []),
    ]);
}

function buildHoveredSeriesInfo(
    entry: InteractionEntry,
    dataIndex: number,
    timestampUtcMs: number | undefined,
): HoveredSeriesInfo {
    const baseInfo = {
        axisIndex: entry.axisIndex,
        color: entry.color,
        dataIndex,
        interactionKey: entry.interactionKey,
        seriesName: entry.seriesName,
        timestampUtcMs,
        value: entry.values[dataIndex],
    };

    if (entry.kind === "member") {
        return {
            ...baseInfo,
            kind: "member",
            groupKey: entry.groupKey,
            memberId: Number(entry.memberId),
        };
    }

    if (entry.kind === "statistic") {
        return {
            ...baseInfo,
            kind: "statistic",
            groupKey: entry.groupKey,
            statisticKey: entry.statisticKey,
            statisticLabel: entry.statisticLabel,
        };
    }

    return {
        ...baseInfo,
        ...(entry.kind === "reference-line"
            ? {
                kind: "reference-line" as const,
                groupKey: entry.groupKey,
            }
            : {
                kind: "point-annotation" as const,
                annotationComment: entry.annotationComment,
                annotationError: entry.annotationError,
                annotationLabel: entry.annotationLabel,
                groupKey: entry.groupKey,
            }),
    };
}

function resolveSeriesLabel(
    hoveredSeriesInfo: HoveredSeriesInfo,
    formatSeriesLabel: ((info: HoveredSeriesInfo) => string) | undefined,
): string {
    return formatSeriesLabel?.(hoveredSeriesInfo) ?? formatDefaultSeriesLabel(hoveredSeriesInfo);
}

function formatDefaultSeriesLabel(hoveredSeriesInfo: HoveredSeriesInfo): string {
    switch (hoveredSeriesInfo.kind) {
        case "member":
            return `Member ${hoveredSeriesInfo.memberId}`;
        case "statistic":
            return `${hoveredSeriesInfo.seriesName ?? "Series"} ${hoveredSeriesInfo.statisticLabel}`;
        case "reference-line":
            return hoveredSeriesInfo.seriesName ?? "Reference line";
        case "point-annotation":
            return `${hoveredSeriesInfo.seriesName ?? "Point annotation"}: ${hoveredSeriesInfo.annotationLabel}`;
    }
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