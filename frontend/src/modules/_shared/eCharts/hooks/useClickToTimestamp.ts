import React from "react";

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

    React.useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        const dom = instance.getDom();
        if (!dom) return;

        const handleClick = (event: Event) => {
            if (!(event instanceof MouseEvent)) return;
            const chart = chartRef.current?.getEchartsInstance();
            if (!chart) return;

            const rect = (chart.getDom() ?? dom).getBoundingClientRect();
            const pixelX = event.clientX - rect.left;
            const pixelY = event.clientY - rect.top;

            const opts = chart.getOption();
            const numGrids = Array.isArray(opts.grid) ? (opts.grid as any[]).length : 1;

            for (let gridIdx = 0; gridIdx < numGrids; gridIdx++) {
                try {
                    const dataPoint = chart.convertFromPixel({ gridIndex: gridIdx }, [pixelX, pixelY]);
                    if (dataPoint == null) continue;
                    const categoryIdx = Math.round(dataPoint[0]);
                    const ts = timestampsRef.current;
                    if (categoryIdx >= 0 && categoryIdx < ts.length) {
                        const clickedTs = ts[categoryIdx];
                        setActiveTimestampUtcMs(clickedTs === activeTimestampRef.current ? null : clickedTs);
                        return;
                    }
                } catch {
                    continue;
                }
            }
        };

        dom.addEventListener("click", handleClick);
        return () => {
            dom.removeEventListener("click", handleClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setActiveTimestampUtcMs, layoutDependency]);
}
