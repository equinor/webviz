import type { CustomSeriesOption } from "echarts/charts";
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from "echarts/types/dist/shared";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { PointAnnotationTrace } from "../../types";

import { makeTimeseriesPointAnnotationSeriesId } from "./ids";
import { formatPointAnnotationTooltip } from "./tooltips";

type PointAnnotationDatum = {
    value: [string, number, number];
    label: string;
    comment?: string;
};

const POINT_ANNOTATION_MARKER_RADIUS = 4;
const POINT_ANNOTATION_ERROR_BAR_HALF_CAP_WIDTH = 4;

export function buildPointAnnotationSeries(trace: PointAnnotationTrace, axisIndex = 0): SeriesBuildResult {
    if (trace.annotations.length === 0) return { series: [], legendData: [] };

    const series: CustomSeriesOption[] = trace.annotations.map(function buildAnnotationSeries(annotation, annotationIndex) {
        const datum: PointAnnotationDatum = {
            value: [timestampUtcMsToCompactIsoString(annotation.date), annotation.value, Math.abs(annotation.error)],
            label: annotation.label,
            comment: annotation.comment,
        };

        return {
            id: makeTimeseriesPointAnnotationSeriesId(trace.name, String(annotationIndex), axisIndex),
            type: "custom",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            clip: true,
            itemStyle: { color: trace.color },
            data: [datum],
            encode: { x: 0, y: 1 },
            z: 5,
            tooltip: {
                trigger: "item",
                formatter: formatPointAnnotationTooltip,
            },
            renderItem: createPointAnnotationRenderItem(trace.color),
        };
    });

    return {
        series,
        legendData: [trace.name],
    };
}

function createPointAnnotationRenderItem(color: string): CustomSeriesOption["renderItem"] {
    return function renderPointAnnotation(
        _params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ) {
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
                    style: { stroke: color, lineWidth: 1.3 },
                },
                {
                    type: "line",
                    shape: {
                        x1: x - POINT_ANNOTATION_ERROR_BAR_HALF_CAP_WIDTH,
                        y1: lower[1],
                        x2: x + POINT_ANNOTATION_ERROR_BAR_HALF_CAP_WIDTH,
                        y2: lower[1],
                    },
                    style: { stroke: color, lineWidth: 1.3 },
                },
                {
                    type: "line",
                    shape: {
                        x1: x - POINT_ANNOTATION_ERROR_BAR_HALF_CAP_WIDTH,
                        y1: upper[1],
                        x2: x + POINT_ANNOTATION_ERROR_BAR_HALF_CAP_WIDTH,
                        y2: upper[1],
                    },
                    style: { stroke: color, lineWidth: 1.3 },
                },
                {
                    type: "circle",
                    shape: { cx: x, cy: center[1], r: POINT_ANNOTATION_MARKER_RADIUS },
                    style: { fill: color, stroke: "#ffffff", lineWidth: 1.1 },
                },
            ],
        };
    };
}