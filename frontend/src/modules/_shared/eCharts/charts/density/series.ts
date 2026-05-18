import type { LineSeriesOption, ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { DistributionTrace } from "../../types";
import { computeKde } from "../../utils/kde";

import { makeDensitySeriesId } from "./ids";

export type DensityDisplayOptions = {
    showMemberPoints?: boolean;
};

export function buildDensitySeries(
    trace: DistributionTrace,

    axisIndex = 0, options: DensityDisplayOptions = {},
): SeriesBuildResult {
    const { showMemberPoints = false } = options;

    const finiteValues = trace.values.filter(Number.isFinite);
    if (finiteValues.length < 2) return { series: [], legendData: [] };

    const kde = computeKde(finiteValues, 200);

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

    if (showMemberPoints) {
        series.push(

            {
                id: makeDensitySeriesId(trace.name, "memberPoints", axisIndex),
                type: "scatter",
                name: `${trace.name} points`,
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                clip: true,
                data: trace.values.map(function buildDensityMemberPoint(value, index) {
                    return {
                        value: [value, 0],
                        memberId: trace.memberIds?.[index] ?? index,
                        itemStyle: trace.memberColors?.[index] ? { color: trace.memberColors[index] } : undefined,
                    };
                }),
                symbol: "rect",
                symbolSize: [1.5, 10],
                symbolOffset: [0, 5],
                itemStyle: { color: trace.color, opacity: 0.6 },
            },


        );
    }

    return { series, legendData: [trace.name] };
}