import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { HeatmapTrace, SubplotGroup } from "../../types";

import type { HeatmapTooltipDataset } from "./tooltips";
type HeatmapDatasetEntry = HeatmapTooltipDataset & {
    trace: HeatmapTrace;
};

type HeatmapValueRange = {
    min: number;
    max: number;
};
export function normalizeHeatmapSubplotGroups(subplotGroups: SubplotGroup<HeatmapTrace>[]): SubplotGroup<HeatmapTrace>[] {
    return subplotGroups.flatMap((group) =>
        group.traces.map((trace) => ({
            title: group.traces.length > 1 ? trace.name : group.title || trace.name,
            traces: [trace],
        })),
    );
}

export function buildHeatmapDatasets(subplotGroups: SubplotGroup<HeatmapTrace>[]): HeatmapDatasetEntry[] {
    return subplotGroups.flatMap((group) => {
        const trace = group.traces[0];
        return trace ? [{ trace, title: group.title || trace.name }] : [];
    });
}



export function computeHeatmapValueRange(datasets: HeatmapDatasetEntry[]): HeatmapValueRange {
    let min = Infinity;
    let max = -Infinity;

    for (const { trace } of datasets) {
        min = Math.min(min, trace.minValue);
        max = Math.max(max, trace.maxValue);
    }

    return {
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 1,
    };
}

export function buildHeatmapVisualMap(valueRange: HeatmapValueRange) {
    return {
        min: valueRange.min,
        max: valueRange.max,
        calculable: true,
        orient: "vertical" as const,
        right: 0,
        top: "center",
        inRange: {
            color: [
                "#313695",
                "#4575b4",
                "#74add1",
                "#abd9e9",
                "#e0f3f8",
                "#ffffbf",
                "#fee090",
                "#fdae61",
                "#f46d43",
                "#d73027",
                "#a50026",
            ],
        },
        formatter: formatHeatmapVisualMapValue,
    };
}

export function formatHeatmapVisualMapValue(value: unknown): string {
    return formatNumber(Number(value), 3);
}