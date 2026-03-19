import { useState, useCallback, useRef } from "react";

import type ReactECharts from "echarts-for-react";

export interface ViewState {
    zoomStart: number;
    zoomEnd: number;
}

export function useEChartsViewState(initialView: ViewState = { zoomStart: 0, zoomEnd: 100 }) {
    const [viewState, setViewState] = useState<ViewState>(initialView);

    // Deboune to prevent jittering during zoom interactions - we only want to update React state after the user has stopped zooming for 250ms
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const handleDataZoom = useCallback((params: any) => {
        const batch = params.batch?.[0] ?? params;
        const { start, end } = batch;

        if (start != null && end != null) {
            // Clear the existing timer if the user is still zooming
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Wait 250ms after the last zoom event before telling React to re-render
            debounceTimer.current = setTimeout(() => {
                setViewState({ zoomStart: start, zoomEnd: end });
            }, 250);
        }
    }, []);

    const applyZoom = useCallback((chartRef: React.RefObject<ReactECharts | null>, start: number, end: number) => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        instance.dispatchAction({
            type: "dataZoom",
            start,
            end,
        });
    }, []);

    return {
        viewState,
        handleDataZoom,
        applyZoom,
    };
}