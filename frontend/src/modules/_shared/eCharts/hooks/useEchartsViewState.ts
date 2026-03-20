import { useCallback, useRef } from "react";
import { ChartZoomState } from "../core/composeChartOption";


export function useEChartsViewState(
    setZoomState: React.Dispatch<React.SetStateAction<ChartZoomState>>
) {
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const handleDataZoom = useCallback((params: any) => {
        const updates = params.batch ?? [params];

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            setZoomState((prev) => {
                const next = { ...prev };
                updates.forEach((item: any) => {
                    const axisKey = item.dataZoomId === "y" ? "y" : "x";
                    next[axisKey] = {
                        start: item.start,
                        end: item.end,
                        startValue: item.startValue,
                        endValue: item.endValue,
                    };
                });
                return next;
            });
        }, 150);
    }, [setZoomState]);

    return { handleDataZoom };
}