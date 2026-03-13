import React from "react";

import type ReactECharts from "echarts-for-react";

export function useHighlightOnHover(chartRef: React.RefObject<ReactECharts | null>, enabled: boolean) {
    const highlightedSeriesRef = React.useRef<string | null>(null);

    function handleHover(e: any) {
        if (!enabled || !e.seriesName || !chartRef.current) return;
        if (typeof e.seriesName !== "string" || !e.seriesName.includes("_real_")) return;

        const instance = chartRef.current.getEchartsInstance();
        if (highlightedSeriesRef.current !== e.seriesName) {
            instance.dispatchAction({ type: "downplay" });
            instance.dispatchAction({ type: "highlight", seriesName: e.seriesName });
            highlightedSeriesRef.current = e.seriesName;
        }

        const dataIndex = getHoveredDataIndex(instance, e);
        if (dataIndex != null && e.seriesIndex != null) {
            instance.dispatchAction({
                type: "showTip",
                seriesIndex: e.seriesIndex,
                dataIndex,
            });
        }
    }

    return React.useMemo(
        () => ({
            mouseover: handleHover,
            mousemove: handleHover,
            mouseout: () => {
                if (!enabled || !chartRef.current) return;
                const instance = chartRef.current.getEchartsInstance();
                instance.dispatchAction({ type: "downplay" });
                instance.dispatchAction({ type: "hideTip" });
                highlightedSeriesRef.current = null;
            },
            globalout: () => {
                if (!enabled || !chartRef.current) return;
                const instance = chartRef.current.getEchartsInstance();
                instance.dispatchAction({ type: "downplay" });
                instance.dispatchAction({ type: "hideTip" });
                highlightedSeriesRef.current = null;
            },
        }),
        [enabled, chartRef],
    );
}

function getHoveredDataIndex(instance: any, e: any): number | null {
    if (typeof e.dataIndex === "number") return e.dataIndex;

    const offsetX = e.event?.offsetX ?? e.event?.zrX;
    const offsetY = e.event?.offsetY ?? e.event?.zrY;
    if (typeof offsetX !== "number" || typeof offsetY !== "number") return null;
    if (typeof e.seriesIndex !== "number") return null;

    const convertedValue = instance.convertFromPixel({ seriesIndex: e.seriesIndex }, [offsetX, offsetY]);
    const xValue = Array.isArray(convertedValue) ? convertedValue[0] : convertedValue;
    if (typeof xValue !== "number" || !Number.isFinite(xValue)) return null;

    const seriesOption = instance.getOption()?.series?.[e.seriesIndex];
    const dataLength = Array.isArray(seriesOption?.data) ? seriesOption.data.length : null;
    if (dataLength == null || dataLength === 0) return null;

    return Math.max(0, Math.min(dataLength - 1, Math.round(xValue)));
}
