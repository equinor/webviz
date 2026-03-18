import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { formatMemberTooltipContent } from "../charts/timeseries";
import {
    isMemberSeries,
    readSeriesMetadata,
    type SeriesMetadata,
} from "../utils/seriesMetadata";

type ZrMouseEvent = {
    offsetX?: number;
    offsetY?: number;
};

type MemberSeriesMeta = {
    axisIndex: number;
    color?: string;
    seriesIndex: number;
    seriesName: string;
    values: number[];
    webvizSeriesMeta?: SeriesMetadata;
};

type ClosestTooltipTarget = {
    seriesIndex: number;
    dataIndex: number;
};

type TooltipTriggerOn = "none" | "click" | "mousemove" | "mousemove|click";

type ClosestMemberTooltipOptions = {
    memberLabel?: string;
};

/**
 * Replaces the default ECharts tooltip with a "snap-to-closest" behavior for dense time-series charts.
 * Instead of displaying a massive tooltip for every intersecting line on the X-axis,
 * this hook tracks the user's cursor and snaps the tooltip and axis pointer
 * to the single member series that is vertically closest to the mouse.
 */
export function useClosestMemberTooltip(
    chartRef: React.RefObject<ReactECharts | null>,
    enabled: boolean,
    timestamps: number[],
    layoutDependency: unknown,
    options: ClosestMemberTooltipOptions = {},
): void {
    const timestampsRef = React.useRef(timestamps);
    const lastShownTooltipKeyRef = React.useRef<string | null>(null);
    timestampsRef.current = timestamps;
    const memberLabel = options.memberLabel;

    React.useEffect(
        function manageTooltipSnapEffect() {
            const chart = chartRef.current;
            if (!chart || !enabled || timestampsRef.current.length === 0) {
                return;
            }

            const instance = chart.getEchartsInstance();
            const originalTriggerOn = readTooltipTriggerOn(instance);

            disableDefaultTooltipTrigger(instance);

            const indexedSeries = buildMemberSeriesIndex(instance);
            if (indexedSeries.size === 0) {
                restoreTooltipTriggerOn(instance, originalTriggerOn);
                return;
            }

            const zr = instance.getZr();

            function clearTooltip() {
                hideTooltip(instance, lastShownTooltipKeyRef);
            }

            function onMouseMove(event: ZrMouseEvent) {
                handlePointerMove(
                    event,
                    instance,
                    indexedSeries,
                    timestampsRef.current,
                    memberLabel,
                    lastShownTooltipKeyRef
                );
            }

            zr.on("mousemove", onMouseMove);
            zr.on("globalout", clearTooltip);

            return function cleanupTooltipSnap() {
                zr.off("mousemove", onMouseMove);
                zr.off("globalout", clearTooltip);
                clearTooltip();
                restoreTooltipTriggerOn(instance, originalTriggerOn);
            };
        },
        [chartRef, enabled, layoutDependency, memberLabel]
    );
}

function disableDefaultTooltipTrigger(instance: ECharts): void {
    instance.setOption({
        tooltip: {
            triggerOn: "none",
        },
    });
}

function hideTooltip(instance: ECharts, lastShownRef: React.MutableRefObject<string | null>): void {
    if (lastShownRef.current == null) return;

    instance.dispatchAction({ type: "hideTip" });
    instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });
    lastShownRef.current = null;
}

function handlePointerMove(
    event: ZrMouseEvent,
    instance: ECharts,
    indexedSeries: Map<number, MemberSeriesMeta[]>,
    timestamps: number[],
    memberLabel: string | undefined,
    lastShownRef: React.MutableRefObject<string | null>
): void {
    const pixelX = typeof event.offsetX === "number" ? event.offsetX : null;
    const pixelY = typeof event.offsetY === "number" ? event.offsetY : null;

    if (pixelX == null || pixelY == null) {
        hideTooltip(instance, lastShownRef);
        return;
    }

    const target = resolveClosestMemberTooltipTarget(
        instance,
        indexedSeries,
        pixelX,
        pixelY,
        timestamps.length
    );

    if (!target) {
        hideTooltip(instance, lastShownRef);
        return;
    }

    const targetKey = `${target.seriesIndex}:${target.dataIndex}`;

    displaySnappedTooltip(instance, target, indexedSeries, timestamps, memberLabel, pixelX, pixelY);
    lastShownRef.current = targetKey;
}

function displaySnappedTooltip(
    instance: ECharts,
    target: ClosestTooltipTarget,
    indexedSeries: Map<number, MemberSeriesMeta[]>,
    timestamps: number[],
    memberLabel: string | undefined,
    pixelX: number,
    pixelY: number
): void {
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
            content: buildTooltipContent(target, indexedSeries, timestamps, memberLabel),
        },
    });
}

export function findClosestMemberSeries(
    series: MemberSeriesMeta[],
    categoryIndex: number,
    cursorValue: number,
): ClosestTooltipTarget | null {
    let closest: ClosestTooltipTarget | null = null;
    let minDistance = Infinity;

    for (const candidate of series) {
        const value = candidate.values[categoryIndex];
        if (!Number.isFinite(value)) continue;

        const distance = Math.abs(value - cursorValue);
        if (distance < minDistance) {
            minDistance = distance;
            closest = {
                seriesIndex: candidate.seriesIndex,
                dataIndex: categoryIndex,
            };
        }
    }

    return closest;
}

function resolveClosestMemberTooltipTarget(
    instance: ECharts,
    indexedSeries: Map<number, MemberSeriesMeta[]>,
    pixelX: number,
    pixelY: number,
    timestampCount: number,
): ClosestTooltipTarget | null {
    for (const [axisIndex, series] of indexedSeries.entries()) {
        if (!instance.containPixel({ gridIndex: axisIndex }, [pixelX, pixelY])) {
            continue;
        }

        const dataPoint = instance.convertFromPixel({ gridIndex: axisIndex }, [pixelX, pixelY]);
        if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
            continue;
        }

        const categoryIndex = Math.round(Number(dataPoint[0]));
        const cursorValue = Number(dataPoint[1]);
        if (!Number.isFinite(categoryIndex) || !Number.isFinite(cursorValue)) {
            continue;
        }
        if (categoryIndex < 0 || categoryIndex >= timestampCount) {
            continue;
        }

        return findClosestMemberSeries(series, categoryIndex, cursorValue);
    }

    return null;
}

function buildMemberSeriesIndex(instance: ECharts): Map<number, MemberSeriesMeta[]> {
    const indexedSeries = new Map<number, MemberSeriesMeta[]>();
    const optionSeries = instance.getOption()?.series;
    if (!Array.isArray(optionSeries)) {
        return indexedSeries;
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
                webvizSeriesMeta?: unknown;
                xAxisIndex?: unknown;
            },
            seriesIndex: number,
        ) => {
            if (!isMemberSeries(seriesOption)) {
                return;
            }

            const axisIndex =
                typeof seriesOption.xAxisIndex === "number" && Number.isFinite(seriesOption.xAxisIndex)
                    ? seriesOption.xAxisIndex
                    : 0;
            const values = extractSeriesValues(seriesOption.data);
            if (values.length === 0) {
                return;
            }

            const bucket = indexedSeries.get(axisIndex) ?? [];
            bucket.push({
                axisIndex,
                color: resolveSeriesColor(seriesOption),
                seriesIndex,
                seriesName: typeof seriesOption.name === "string" ? seriesOption.name : "",
                values,
                webvizSeriesMeta: readSeriesMetadata(seriesOption) ?? undefined,
            });
            indexedSeries.set(axisIndex, bucket);
        },
    );

    return indexedSeries;
}

function extractSeriesValues(data: unknown): number[] {
    if (!Array.isArray(data)) {
        return [];
    }

    return data.map((entry) => {
        if (typeof entry === "number") {
            return entry;
        }
        if (Array.isArray(entry)) {
            return Number(entry[entry.length - 1]);
        }
        if (entry && typeof entry === "object" && "value" in entry) {
            const value = (entry as { value?: unknown }).value;
            if (typeof value === "number") {
                return value;
            }
            if (Array.isArray(value)) {
                return Number(value[value.length - 1]);
            }
        }
        return Number.NaN;
    });
}

function buildTooltipContent(
    target: ClosestTooltipTarget,
    indexedSeries: Map<number, MemberSeriesMeta[]>,
    timestamps: number[],
    memberLabel?: string,
): string {
    for (const series of indexedSeries.values()) {
        const match = series.find((candidate) => candidate.seriesIndex === target.seriesIndex);
        if (!match) continue;

        return formatMemberTooltipContent({
            axisValue: timestampUtcMsToCompactIsoString(timestamps[target.dataIndex]),
            seriesName: match.seriesName,
            webvizSeriesMeta: match.webvizSeriesMeta,
            value: match.values[target.dataIndex],
            color: match.color,
            memberLabel,
        });
    }

    return "";
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
    instance.setOption({
        tooltip: {
            triggerOn,
        },
    });
}

function isTooltipTriggerOn(value: unknown): value is TooltipTriggerOn {
    return value === "none" || value === "click" || value === "mousemove" || value === "mousemove|click";
}