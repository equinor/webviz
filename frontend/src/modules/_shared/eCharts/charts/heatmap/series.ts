import type { HeatmapSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { HeatmapTrace } from "../../types";

import { makeHeatmapSeriesId } from "./ids";

export function buildHeatmapSeries(trace: HeatmapTrace, axisIndex = 0): SeriesBuildResult {
    const series: HeatmapSeriesOption = (
        {
            id: makeHeatmapSeriesId(trace.name, "primary", axisIndex),
            type: "heatmap",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: trace.data,
            emphasis: {
                itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" },
            },

        }
    );

    return {
        series: [series],
        legendData: [],
    };
}