import React from "react";

import type ReactECharts from "echarts-for-react";

export function useHighlightOnHover(chartRef: React.RefObject<ReactECharts | null>, enabled: boolean) {
    const highlightedSeriesRef = React.useRef<string | null>(null);

    return React.useMemo(
        () => ({
            mouseover: (e: any) => {
                if (!enabled || !chartRef.current) return;
                const highlightTarget = getHighlightTarget(e);
                if (!highlightTarget) return;

                const instance = chartRef.current.getEchartsInstance();
                if (highlightedSeriesRef.current !== highlightTarget.key) {
                    instance.dispatchAction({ type: "downplay" });
                    instance.dispatchAction({ type: "highlight", ...highlightTarget.action });
                    highlightedSeriesRef.current = highlightTarget.key;
                }
            },
            mouseout: () => {
                if (!enabled || !chartRef.current) return;
                chartRef.current.getEchartsInstance().dispatchAction({ type: "downplay" });
                highlightedSeriesRef.current = null;
            },
            globalout: () => {
                if (!enabled || !chartRef.current) return;
                chartRef.current.getEchartsInstance().dispatchAction({ type: "downplay" });
                highlightedSeriesRef.current = null;
            },
        }),
        [enabled, chartRef],
    );
}

function getHighlightTarget(
    event: any,
): { key: string; action: { seriesIndex: number } | { seriesId: string } | { seriesName: string } } | null {
    if (typeof event?.seriesIndex === "number") {
        return { key: `index:${event.seriesIndex}`, action: { seriesIndex: event.seriesIndex } };
    }

    if (typeof event?.seriesId === "string") {
        return { key: `id:${event.seriesId}`, action: { seriesId: event.seriesId } };
    }

    if (typeof event?.seriesName === "string") {
        return { key: `name:${event.seriesName}`, action: { seriesName: event.seriesName } };
    }

    return null;
}
