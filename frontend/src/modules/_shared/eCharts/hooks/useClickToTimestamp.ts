import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

/**
 * Attaches a native DOM click handler that converts click position → category
 * index → timestamp. Toggles selection (click again to deselect).
 */
export function useClickToTimestamp(
    chartRef: React.RefObject<ReactECharts | null>,
    timestamps: number[],
    activeTimestampUtcMs: number | null,
    setActiveTimestampUtcMs: (ts: number | null) => void,
    layoutDependency: unknown,
): void {
    const activeTimestampRef = React.useRef(activeTimestampUtcMs);
    activeTimestampRef.current = activeTimestampUtcMs;

    const timestampsRef = React.useRef(timestamps);
    timestampsRef.current = timestamps;

    React.useEffect(
        function attachClickEventListener() {
            const instance = chartRef.current?.getEchartsInstance();
            if (!instance) return;

            const dom = instance.getDom();
            if (!dom) return;

            function onChartClick(event: Event) {
                handleChartClick(
                    event,
                    chartRef,
                    dom,
                    timestampsRef.current,
                    activeTimestampRef.current,
                    setActiveTimestampUtcMs,
                );
            }

            dom.addEventListener("click", onChartClick);

            return function cleanupClickEventListener() {
                dom.removeEventListener("click", onChartClick);
            };
        },
        [chartRef, setActiveTimestampUtcMs, layoutDependency],
    );
}

function handleChartClick(
    event: Event,
    chartRef: React.RefObject<ReactECharts | null>,
    dom: HTMLElement,
    timestamps: number[],
    activeTimestamp: number | null,
    setActiveTimestampUtcMs: (ts: number | null) => void,
): void {
    if (!(event instanceof MouseEvent)) return;
    if (!event.ctrlKey && !event.metaKey) {
        return;
    }
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const rect = (chart.getDom() ?? dom).getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    const opts = chart.getOption();
    const numGrids = Array.isArray(opts.grid) ? opts.grid.length : 1;

    const clickedTs = resolveTimestampFromPixel(chart, pixelX, pixelY, numGrids, timestamps);

    if (clickedTs != null) {
        setActiveTimestampUtcMs(clickedTs === activeTimestamp ? null : clickedTs);
    }
}

function resolveTimestampFromPixel(
    chart: ECharts,
    pixelX: number,
    pixelY: number,
    numGrids: number,
    timestamps: number[],
): number | null {
    for (let gridIdx = 0; gridIdx < numGrids; gridIdx++) {
        try {
            const dataPoint = chart.convertFromPixel({ gridIndex: gridIdx }, [pixelX, pixelY]);
            if (dataPoint == null) continue;

            const categoryIdx = Math.round(dataPoint[0]);
            if (categoryIdx >= 0 && categoryIdx < timestamps.length) {
                return timestamps[categoryIdx] ?? null;
            }
        } catch {
            continue;
        }
    }

    return null;
}