import type { LineSeriesOption, ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../../builders/composeChartOption";
import type { DistributionTrace } from "../../../types";
import { computeKde } from "../../../utils/kde";
import { withSeriesMetadata } from "../../../utils/seriesMetadata";

import { makeDensitySeriesId } from "./ids";

export type DensityDisplayOptions = {
    showRealizationPoints?: boolean;
};

export function buildDensitySeries(
    trace: DistributionTrace,
    options: DensityDisplayOptions = {},
    axisIndex = 0,
): SeriesBuildResult {
    const { showRealizationPoints = false } = options;

    if (trace.values.length < 2) return { series: [], legendData: [] };

    const sorted = [...trace.values].sort((a, b) => a - b);
    const kde = computeKde(sorted, 200);
    const realizationBaseline = -0.01 * Math.max(...kde.map((point) => point[1]));

    const series: Array<LineSeriesOption | ScatterSeriesOption> = [];

    series.push(
        withSeriesMetadata(
            {
                id: makeDensitySeriesId(trace.name, "kde", axisIndex),
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
            {
                family: "distribution",
                chart: "density",
                axisIndex,
                roles: ["primary"],
            },
        ),
    );

    if (showRealizationPoints) {
        series.push(
            withSeriesMetadata(
                {
                    id: makeDensitySeriesId(trace.name, "points", axisIndex),
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
                {
                    family: "distribution",
                    chart: "density",
                    axisIndex,
                    roles: ["memberPoints"],
                },
            ),
        );
    }

    return { series, legendData: [trace.name] };
}