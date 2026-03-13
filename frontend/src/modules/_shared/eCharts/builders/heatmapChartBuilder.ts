import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SubplotAxisDef } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import { buildHeatmapSeries } from "../series";
import type { ContainerSize, HeatmapTrace, SubplotGroup } from "../types";
import { composeChartOption } from "./composeChartOption";

export function buildHeatmapChart(
    subplotGroups: SubplotGroup<HeatmapTrace>[],
    valueLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
): EChartsOption {
    const datasets = subplotGroups.flatMap((g) => g.traces);
    if (datasets.length === 0) return {};

    const numSubplots = datasets.length;
    const layout = computeSubplotGridLayout(numSubplots, { marginRightPct: 8 });

    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const ds of datasets) {
        if (ds.minValue < globalMin) globalMin = ds.minValue;
        if (ds.maxValue > globalMax) globalMax = ds.maxValue;
    }
    if (!isFinite(globalMin)) globalMin = 0;
    if (!isFinite(globalMax)) globalMax = 1;

    const axisDefs: SubplotAxisDef[] = [];
    const series: any[] = [];

    for (let i = 0; i < numSubplots; i++) {
        const ds = datasets[i];

        axisDefs.push({
            xAxis: { type: "category", data: ds.xLabels, splitArea: true },
            yAxis: { type: "category", data: ds.yLabels, splitArea: true },
            title: ds.name,
        });

        const activeDate =
            activeTimestampUtcMs != null
                ? (ds.xLabels[ds.timestampsUtcMs.indexOf(activeTimestampUtcMs)] ?? null)
                : null;

        series.push(buildHeatmapSeries(ds, i, activeDate));
    }

    const axes = buildSubplotAxes(layout, axisDefs);

    return composeChartOption(layout, axes, {
        series: numSubplots === 1 && series[0] ? [series[0]] : series,
        containerSize,
        tooltip: {
            trigger: "item" as const,
            formatter: (params: any) => {
                const { data } = params;
                if (!data) return "";
                const [xIdx, yIdx, val] = data;
                const ds = datasets[0];
                const xLabel = ds.xLabels[xIdx] ?? "";
                const yLabel = ds.yLabels[yIdx] ?? "";
                return `${yLabel}<br/>${xLabel}<br/><b>${valueLabel}:</b> ${formatNumber(val, 4)}`;
            },
        },
        visualMap: {
            min: globalMin,
            max: globalMax,
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
            formatter: (value: unknown) => formatNumber(Number(value), 3),
        },
    });
}
