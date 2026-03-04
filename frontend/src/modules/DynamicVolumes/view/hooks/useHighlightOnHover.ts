import React from "react";

import type ReactECharts from "echarts-for-react";

/**
 * Returns ECharts event handlers that highlight the hovered realization
 * series and downplay all others.  Only active when individual realizations
 * are shown (i.e. `enabled` is true).
 */
export function useHighlightOnHover(chartRef: React.RefObject<ReactECharts | null>, enabled: boolean) {
    const highlightedSeriesRef = React.useRef<string | null>(null);

    return React.useMemo(
        () => ({
            mouseover: (e: any) => {
                if (!enabled || !e.seriesName || !chartRef.current) return;
                const instance = chartRef.current.getEchartsInstance();
                if (highlightedSeriesRef.current !== e.seriesName) {
                    instance.dispatchAction({ type: "downplay" });
                    instance.dispatchAction({ type: "highlight", seriesName: e.seriesName });
                    highlightedSeriesRef.current = e.seriesName;
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
