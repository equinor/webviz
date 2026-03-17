import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { formatRealizationTooltipContent } from "../interaction/tooltips/timeseries";
import { isRealizationSeries } from "../utils/seriesId";

type ZrMouseEvent = {
    offsetX?: number;
    offsetY?: number;
};

type RealizationSeriesMeta = {
    axisIndex: number;
    color?: string;
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    values: number[];
};

type ClosestTooltipTarget = {
    seriesIndex: number;
    dataIndex: number;
};

type TooltipTriggerOn = "none" | "click" | "mousemove" | "mousemove|click";

/**
 * Replaces the default ECharts tooltip with a "snap-to-closest" behavior for dense time-series charts.
 * * Instead of displaying a massive tooltip for every intersecting line on the X-axis, 
 * this hook tracks the user's cursor and manually snaps the tooltip and axis pointer 
 * to the single series line that is vertically closest to the mouse.
 *
 * @param chartRef - React ref attached to the ECharts instance.
 * @param enabled - Toggles the custom tooltip behavior on or off.
 * @param timestamps - Array of X-axis timestamps used to resolve the current category index.
 * @param layoutDependency - A dependency trigger to re-bind the hook when the chart layout changes.
 */
export function useClosestRealizationTooltip(
    chartRef: React.RefObject<ReactECharts | null>,
    enabled: boolean,
    timestamps: number[],
    layoutDependency: unknown,
): void {
    const timestampsRef = React.useRef(timestamps);
    const lastShownTooltipKeyRef = React.useRef<string | null>(null);
    timestampsRef.current = timestamps;

    React.useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !enabled || timestampsRef.current.length === 0) {
            return;
        }
        const instance = chart.getEchartsInstance();
        const originalTriggerOn = readTooltipTriggerOn(instance);
        instance.setOption({
            tooltip: {
                triggerOn: "none",
            },
        });

        const indexedSeries = buildRealizationSeriesIndex(instance);
        if (indexedSeries.size === 0) {
            restoreTooltipTriggerOn(instance, originalTriggerOn);
            return;
        }

        const zr = instance.getZr();

        function clearTooltip() {
            if (lastShownTooltipKeyRef.current == null) return;

            instance.dispatchAction({ type: "hideTip" });
            instance.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });
            lastShownTooltipKeyRef.current = null;
        }

        function handleMouseMove(event: ZrMouseEvent) {
            const pixelX = typeof event.offsetX === "number" ? event.offsetX : null;
            const pixelY = typeof event.offsetY === "number" ? event.offsetY : null;
            if (pixelX == null || pixelY == null) {
                clearTooltip();
                return;
            }

            const target = resolveClosestRealizationTooltipTarget(
                instance,
                indexedSeries,
                pixelX,
                pixelY,
                timestampsRef.current.length,
            );
            if (!target) {
                clearTooltip();
                return;
            }

            instance.dispatchAction({
                type: "updateAxisPointer",
                currTrigger: "mousemove",
                x: pixelX,
                y: pixelY,
            });

            const targetKey = `${target.seriesIndex}:${target.dataIndex}`;
            instance.dispatchAction({
                type: "showTip",
                x: pixelX,
                y: pixelY,
                tooltip: {
                    content: buildTooltipContent(target, indexedSeries, timestampsRef.current),
                },
            });
            lastShownTooltipKeyRef.current = targetKey;
        }

        zr.on("mousemove", handleMouseMove);
        zr.on("globalout", clearTooltip);

        return () => {
            zr.off("mousemove", handleMouseMove);
            zr.off("globalout", clearTooltip);
            clearTooltip();
            restoreTooltipTriggerOn(instance, originalTriggerOn);
        };
    }, [chartRef, enabled, layoutDependency]);
}

export function findClosestRealizationSeries(
    series: RealizationSeriesMeta[],
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

function resolveClosestRealizationTooltipTarget(
    instance: ECharts,
    indexedSeries: Map<number, RealizationSeriesMeta[]>,
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

        return findClosestRealizationSeries(series, categoryIndex, cursorValue);
    }

    return null;
}

function buildRealizationSeriesIndex(instance: ECharts): Map<number, RealizationSeriesMeta[]> {
    const indexedSeries = new Map<number, RealizationSeriesMeta[]>();
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
                xAxisIndex?: unknown;
            },
            seriesIndex: number,
        ) => {
            const seriesId = typeof seriesOption.id === "string" ? seriesOption.id : null;
            if (!seriesId || !isRealizationSeries(seriesId)) {
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
                seriesId,
                seriesIndex,
                seriesName: typeof seriesOption.name === "string" ? seriesOption.name : "",
                values,
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
    indexedSeries: Map<number, RealizationSeriesMeta[]>,
    timestamps: number[],
): string {
    for (const series of indexedSeries.values()) {
        const match = series.find((candidate) => candidate.seriesIndex === target.seriesIndex);
        if (!match) continue;

        return formatRealizationTooltipContent({
            axisValue: timestampUtcMsToCompactIsoString(timestamps[target.dataIndex]),
            seriesName: match.seriesName,
            seriesId: match.seriesId,
            value: match.values[target.dataIndex],
            color: match.color,
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
