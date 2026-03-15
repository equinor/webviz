import type { MarkLineOption } from "echarts/types/dist/shared";

import type { ChartSeriesOption } from "../builders/composeChartOption";
import { isFanchartSeries } from "../utils/seriesId";

export function createTimestampMarkLine(dateLabel: string): MarkLineOption {
    return {
        silent: true,
        symbol: "none",
        animation: false,
        lineStyle: { type: "dashed", color: "#333", width: 1.5 },
        label: {
            show: true,

            formatter: dateLabel,
            position: "insideEndBottom",
            fontSize: 10,
            color: "#333",
        },
        data: [{ xAxis: dateLabel }],
    };
}

/**
 * Add a vertical marker line at the active timestamp on the first eligible
 * series of each grid. Skips fanchart custom series. Mutates the series array.
 */
export function applyActiveTimestampMarker(allSeries: ChartSeriesOption[], activeDate: string): void {
    const seenGrids = new Set<number>();
    for (const s of allSeries) {
        const gridIdx: number = s.xAxisIndex ?? 0;
        if (seenGrids.has(gridIdx)) continue;
        const seriesId = typeof s.id === "string" ? s.id : "";
        if (isFanchartSeries(seriesId)) continue;
        seenGrids.add(gridIdx);
        // All cartesian series support markLine at runtime; narrow to access the property
        (s as ChartSeriesOption & { markLine?: MarkLineOption }).markLine = createTimestampMarkLine(activeDate);
    }
}
