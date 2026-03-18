import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../../../tooltip/core";

export type HeatmapTooltipDataset = {
    title: string;
    trace: {
        xLabels: string[];
        yLabels: string[];
    };
};

export function buildHeatmapTooltip(datasets: HeatmapTooltipDataset[], valueLabel: string) {
    return {
        trigger: "item" as const,
        formatter: (params: CallbackDataParams) => formatHeatmapItemTooltip(params, datasets, valueLabel),
    };
}

export function formatHeatmapItemTooltip(
    params: CallbackDataParams,
    datasets: HeatmapTooltipDataset[],
    valueLabel: string,
): string {
    const datasetIndex = typeof params.seriesIndex === "number" ? params.seriesIndex : 0;
    const dataset = datasets[datasetIndex] ?? datasets[0];
    const point = extractHeatmapPoint(params);

    if (!dataset || !point) return "";

    const [xIndex, yIndex, value] = point;
    const xLabel = dataset.trace.xLabels[xIndex] ?? "";
    const yLabel = dataset.trace.yLabels[yIndex] ?? "";

    return formatCompactTooltip(dataset.title, [
        { label: "X", value: xLabel },
        { label: "Y", value: yLabel },
        { label: valueLabel, value: formatNumber(value, 4) },
    ]);
}

function extractHeatmapPoint(params: CallbackDataParams): [number, number, number] | null {
    const point = Array.isArray(params.data) ? params.data : Array.isArray(params.value) ? params.value : null;
    if (!point || point.length < 3) return null;

    return [Number(point[0]), Number(point[1]), Number(point[2])];
}