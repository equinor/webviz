import { formatRgb, parse } from "culori";
import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { DistributionTrace } from "../../types";
import type { ConvergencePoint } from "../../utils/convergence";
import { calcConvergence } from "../../utils/convergence";


import type { ConvergenceStatisticKey } from "./ids";
import { makeConvergenceSeriesId } from "./ids";

export type ConvergenceChartSeries = LineSeriesOption | CustomSeriesOption;

export function buildConvergenceSeries(trace: DistributionTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.memberIds || trace.values.length === 0) return { series: [], legendData: [] };

    const pairs = trace.memberIds.map(function pairMemberWithValue(memberId, index) {
        return {
            member: memberId,
            value: trace.values[index],
        };
    });
    pairs.sort((a, b) => a.member - b.member);

    const convergence = calcConvergence(pairs);
    let lightColor = trace.color;
    const rgbColor = parse(trace.color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    const series: ConvergenceChartSeries[] = [
        createConvergenceLineSeries(trace, convergence, "p90", axisIndex),
        createConvergenceLineSeries(trace, convergence, "mean", axisIndex),
        createConvergenceLineSeries(trace, convergence, "p10", axisIndex),
        createConvergenceBandSeries(trace, convergence, lightColor, axisIndex),
    ];

    return {
        series,
        legendData: series.length > 0 ? [trace.name] : [],
    };
}

function createConvergenceBandSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    fillColor: string,
    axisIndex: number,
): CustomSeriesOption {
    return (
        {
            id: makeConvergenceSeriesId(trace.name, "band", axisIndex),
            type: "custom",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            clip: true,
            itemStyle: { color: trace.color },
            data: convergence.map((point) => [point.member, point.p90, point.p10]),
            encode: { x: 0, y: [1, 2] },
            tooltip: { show: false },
            silent: true,
            z: 1,
            renderItem: createConvergenceBandRenderItem(convergence, fillColor),
        }

    );
}

function createConvergenceBandRenderItem(
    convergence: ConvergencePoint[],
    fillColor: string,
): CustomSeriesOption["renderItem"] {
    return function renderConvergenceBand(params, api) {
        const bandParams = params as typeof params & {
            dataIndexInside?: number;
            dataInsideLength?: number;
            dataIndex?: number;
        };

        if (bandParams.dataIndexInside !== 0) {
            return { type: "group", children: [] };
        }

        const count = bandParams.dataInsideLength ?? 0;
        const startIndex = bandParams.dataIndex ?? 0;
        if (count === 0) return { type: "group", children: [] };

        const points: number[][] = [];

        for (let index = 0; index < count; index++) {
            const point = convergence[startIndex + index];
            points.push(api.coord([point.member, point.p90]));
        }

        for (let index = count - 1; index >= 0; index--) {
            const point = convergence[startIndex + index];
            points.push(api.coord([point.member, point.p10]));
        }

        return {
            type: "polygon",
            shape: { points },
            style: { fill: fillColor, opacity: 1 },
        };
    };
}

function createConvergenceLineSeries(
    trace: DistributionTrace,
    convergence: ConvergencePoint[],
    statKey: ConvergenceStatisticKey,
    axisIndex: number,
): LineSeriesOption {
    return (
        {
            id: makeConvergenceSeriesId(trace.name, "summary", axisIndex, statKey),
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: convergence.map((point) => [point.member, point[statKey]]),
            itemStyle: { color: trace.color },
            lineStyle: buildConvergenceLineStyle(trace.color, statKey),
            symbol: "none",
            showSymbol: false,
            z: statKey === "mean" ? 3 : 2,
            emphasis: { disabled: true },
            tooltip: {
                valueFormatter: (value) => formatNumber(Number(value)),
            },
        }
    );
}

function buildConvergenceLineStyle(color: string, statKey: ConvergenceStatisticKey): LineSeriesOption["lineStyle"] {
    switch (statKey) {
        case "p90":
            return { color, width: 1, type: [8, 4, 2, 4] };
        case "p10":
            return { color, width: 1, type: "dashed" };
        default:
            return { color, width: 1 };
    }
}

