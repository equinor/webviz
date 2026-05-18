import React from "react";

import type { ECharts } from "echarts";
import type ReactECharts from "echarts-for-react";

/**
 * Attaches a DOM click handler that converts click position → category
 * index → timestamp. Requires Ctrl/Cmd + click. Toggles selection on repeat click.
 *
 * Uses a native DOM listener on the chart's container element rather than a
 * ZRender listener so the handler survives the temporary dispose/re-init
 * cycle that echarts-for-react performs during initial sizing.
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
            const wrapper = chartRef.current;
            if (!wrapper) return;

            // Get the container DOM element via the public ECharts API.
            // This element persists across the dispose/re-init cycle that
            // echarts-for-react performs during initial sizing.
            const instance = wrapper.getEchartsInstance();
            if (!instance || instance.isDisposed()) return;
            const ele = instance.getDom() as HTMLElement;
            if (!ele) return;

            function onClick(e: MouseEvent) {
                if (!e.ctrlKey && !e.metaKey) return;

                const chart = chartRef.current?.getEchartsInstance();
                if (!chart || chart.isDisposed()) return;

                // Convert page coordinates to offset relative to the chart container
                const rect = ele.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;

                const clickedTs = resolveTimestampFromPixel(
                    chart,
                    offsetX,
                    offsetY,
                    getNumGrids(chart),
                    timestampsRef.current,
                );

                if (clickedTs != null) {
                    setActiveTimestampUtcMs(clickedTs === activeTimestampRef.current ? null : clickedTs);
                }
            }

            ele.addEventListener("click", onClick);

            return function cleanupClickEventListener() {
                ele.removeEventListener("click", onClick);
            };
        },
        [chartRef, setActiveTimestampUtcMs, layoutDependency],
    );
}

function getNumGrids(chart: ECharts): number {
    const opts = chart.getOption();
    return Array.isArray(opts.grid) ? opts.grid.length : 1;
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