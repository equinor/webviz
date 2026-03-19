import type { HeatmapSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { HeatmapTrace } from "../../types";
import { withSeriesMetadata } from "../../utils/seriesMetadata";

import { makeHeatmapSeriesId } from "./ids";

export function buildHeatmapSeries(trace: HeatmapTrace, axisIndex = 0): SeriesBuildResult {
    const series: HeatmapSeriesOption = withSeriesMetadata(
        {
            id: makeHeatmapSeriesId(trace.name, "cells", axisIndex),
            type: "heatmap",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: trace.data,
            emphasis: {
                itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" },
            },

        },
        {
            chart: "heatmap",
            axisIndex,
            roles: ["primary"],
        },
    );

    return {
        series: [series],
        legendData: [],
    };
}