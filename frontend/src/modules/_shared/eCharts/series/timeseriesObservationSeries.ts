import type { CustomSeriesOption } from "echarts/charts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import { formatObservationTooltip } from "../interaction/tooltipFormatters";
import type { ObservationTrace } from "../types";
import { makeObservationSeriesId } from "../utils/seriesId";

type ObservationDatum = {
    value: [string, number, number];
    label: string;
    comment?: string;
};

const OBSERVATION_MARKER_RADIUS = 4;
const OBSERVATION_ERROR_BAR_HALF_CAP_WIDTH = 4;

export function buildObservationSeries(trace: ObservationTrace, axisIndex = 0): SeriesBuildResult {
    if (trace.observations.length === 0) return { series: [], legendData: [] };

    const series: CustomSeriesOption[] = trace.observations.map((observation, observationIndex) => {
        const datum: ObservationDatum = {
            value: [timestampUtcMsToCompactIsoString(observation.date), observation.value, Math.abs(observation.error)],
            label: observation.label,
            comment: observation.comment,
        };

        return {
            id: makeObservationSeriesId(trace.name, String(observationIndex), axisIndex),
            type: "custom",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            color: trace.color,
            data: [datum],
            encode: { x: 0, y: 1 },
            z: 5,
            tooltip: {
                trigger: "item",
                formatter: formatObservationTooltip,
            },
            renderItem(_params, api) {
                const xValue = api.value(0) as string | number;
                const yValue = Number(api.value(1));
                const yError = Number(api.value(2));

                const center = api.coord([xValue, yValue]);
                const upper = api.coord([xValue, yValue + yError]);
                const lower = api.coord([xValue, yValue - yError]);

                const x = center[0];

                return {
                    type: "group",
                    children: [
                        {
                            type: "line",
                            shape: { x1: x, y1: lower[1], x2: x, y2: upper[1] },
                            style: { stroke: trace.color, lineWidth: 1.3 },
                        },
                        {
                            type: "line",
                            shape: {
                                x1: x - OBSERVATION_ERROR_BAR_HALF_CAP_WIDTH,
                                y1: lower[1],
                                x2: x + OBSERVATION_ERROR_BAR_HALF_CAP_WIDTH,
                                y2: lower[1],
                            },
                            style: { stroke: trace.color, lineWidth: 1.3 },
                        },
                        {
                            type: "line",
                            shape: {
                                x1: x - OBSERVATION_ERROR_BAR_HALF_CAP_WIDTH,
                                y1: upper[1],
                                x2: x + OBSERVATION_ERROR_BAR_HALF_CAP_WIDTH,
                                y2: upper[1],
                            },
                            style: { stroke: trace.color, lineWidth: 1.3 },
                        },
                        {
                            type: "circle",
                            shape: { cx: x, cy: center[1], r: OBSERVATION_MARKER_RADIUS },
                            style: { fill: trace.color, stroke: "#ffffff", lineWidth: 1.1 },
                        },
                    ],
                };
            },
        };
    });

    return {
        series,
        legendData: [trace.name],
    };
}
