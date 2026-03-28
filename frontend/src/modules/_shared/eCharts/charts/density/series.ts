import type { LineSeriesOption, ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { DistributionTrace } from "../../types";
import { computeKde } from "../../utils/kde";

import { makeDensitySeriesId } from "./ids";

export type DensityDisplayOptions = {
    showRealizationPoints?: boolean;
};

export function buildDensitySeries(
    trace: DistributionTrace,

    axisIndex = 0, options: DensityDisplayOptions = {},
): SeriesBuildResult {
    const { showRealizationPoints = false } = options;

    if (trace.values.length < 2) return { series: [], legendData: [] };

    const sorted = [...trace.values].sort((a, b) => a - b);
    const kde = computeKde(sorted, 200);
    const realizationBaseline = -0.01 * Math.max(...kde.map((point) => point[1]));

    const series: Array<LineSeriesOption | ScatterSeriesOption> = [];

    series.push(

        {
            id: makeDensitySeriesId(trace.name, "primary", axisIndex),
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: kde.map(([x, y]) => [x, y]),
            itemStyle: { color: trace.color },
            areaStyle: { color: trace.color, opacity: 0.3 },
            lineStyle: { color: trace.color, width: 1.5 },
            symbol: "none",
            smooth: true,
        },


    );

    if (showRealizationPoints) {
        series.push(

            {
                id: makeDensitySeriesId(trace.name, "memberPoints", axisIndex),
                type: "scatter",
                name: `${trace.name} points`,
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                data: trace.values.map((value, index) => ({
                    value: [value, realizationBaseline],
                    realizationId: trace.realizationIds?.[index] ?? index,
                })),
                symbol: "circle",
                symbolSize: 4,
                itemStyle: { color: trace.color, opacity: 0.5 },
            },


        );
    }

    return { series, legendData: [trace.name] };
}