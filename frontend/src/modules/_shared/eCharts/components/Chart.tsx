import React from "react";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

export interface ChartProps {
    option: EChartsOption;
    style?: React.CSSProperties;
    onDataZoom?: (params: unknown) => void;
    /** Additional ECharts events beyond datazoom. */
    onEvents?: Record<string, (params: unknown) => void>;
    chartRef?: React.Ref<ReactECharts>;
}

const DEFAULT_STYLE: React.CSSProperties = { height: "100%", width: "100%" };

export function Chart({ option, style, onDataZoom, onEvents, chartRef }: ChartProps): React.ReactNode {
    const mergedEvents = React.useMemo(
        function mergeChartEvents() {
            const events: Record<string, (params: unknown) => void> = { ...onEvents };
            if (onDataZoom) events.datazoom = onDataZoom;
            return events;
        },
        [onDataZoom, onEvents],
    );

    return (
        <ReactECharts
            ref={chartRef}
            option={option}
            style={style ?? DEFAULT_STYLE}
            onEvents={mergedEvents}
            notMerge
            lazyUpdate
        />
    );
}
