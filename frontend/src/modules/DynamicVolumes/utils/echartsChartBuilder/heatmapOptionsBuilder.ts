import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { HeatmapDataset } from "../../typesAndEnums";

import { createTimestampMarkLine } from "./activeTimestampMarker";
import { DEFAULT_LAYOUT_CONFIG, computeSubplotGridLayout } from "./subplotGridLayout";

// ── Constants ──

// Heatmap needs extra right margin for the visualMap control
const MARGIN_RIGHT_PCT = 8;

/**
 * Build a full EChartsOption for the drainage heatmap.
 *
 * One heatmap subplot per ensemble. Y-axis = region/zone labels,
 * X-axis = date, color = mean value (RF or raw).
 */
export function buildHeatmapOptions(
    datasets: HeatmapDataset[],
    valueLabel: string,
    activeTimestampUtcMs: number | null = null,
): EChartsOption {
    if (datasets.length === 0) return {};

    const numSubplots = datasets.length;
    const isMultiGrid = numSubplots > 1;
    const layout = computeSubplotGridLayout(numSubplots);

    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const series: any[] = [];
    const titles: any[] = [];

    // Compute global min/max for a shared visualMap
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const ds of datasets) {
        if (ds.minValue < globalMin) globalMin = ds.minValue;
        if (ds.maxValue > globalMax) globalMax = ds.maxValue;
    }
    if (!isFinite(globalMin)) globalMin = 0;
    if (!isFinite(globalMax)) globalMax = 1;

    for (let i = 0; i < numSubplots; i++) {
        const ds = datasets[i];
        const cell = layout.cells[i];

        // Grid — use layout cells for multi-grid, simple for single
        if (isMultiGrid) {
            grids.push(layout.grids[i]);
        }

        xAxes.push({
            type: "category",
            gridIndex: i,
            data: ds.xLabels,
            splitArea: { show: true },
            axisLabel: { show: true, fontSize: 10 },
            axisTick: { show: true },
        });

        yAxes.push({
            type: "category",
            gridIndex: i,
            data: ds.yLabels,
            splitArea: { show: true },
            axisLabel: { show: true, fontSize: 11 },
        });

        // Resolve active timestamp marker for this dataset
        const activeDate =
            activeTimestampUtcMs != null
                ? (ds.xLabels[ds.timestampsUtcMs.indexOf(activeTimestampUtcMs)] ?? null)
                : null;

        series.push({
            type: "heatmap",
            xAxisIndex: i,
            yAxisIndex: i,
            data: ds.data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: "rgba(0, 0, 0, 0.5)",
                },
            },
            ...(activeDate != null && {
                markLine: createTimestampMarkLine(activeDate),
            }),
        });

        if (isMultiGrid && ds.ensembleTitle) {
            titles.push({
                text: ds.ensembleTitle,
                left: `${cell.leftPct + cell.widthPct / 2}%`,
                top: `${cell.titleTopPct}%`,
                textAlign: "center" as const,
                textStyle: { fontSize: 12, fontWeight: "normal" as const, color: "#555" },
            });
        }
    }

    return {
        animation: false,
        title: titles.length > 0 ? titles : undefined,
        tooltip: {
            trigger: "item" as const,
            formatter: (params: any) => {
                const { data, name } = params;
                if (!data) return "";
                const [xIdx, yIdx, val] = data;
                const ds = datasets[0]; // use first for labels (all share same x)
                const xLabel = ds.xLabels[xIdx] ?? "";
                const yLabel = ds.yLabels[yIdx] ?? name ?? "";
                return `${yLabel}<br/>${xLabel}<br/><b>${valueLabel}:</b> ${formatNumber(val, 4)}`;
            },
        },
        grid: isMultiGrid
            ? grids
            : {
                  top: `${DEFAULT_LAYOUT_CONFIG.topSpacePct}%`,
                  right: `${MARGIN_RIGHT_PCT}%`,
                  bottom: `${DEFAULT_LAYOUT_CONFIG.bottomSpacePct}%`,
                  left: "2%",
                  containLabel: true,
              },
        xAxis: isMultiGrid ? xAxes : xAxes[0],
        yAxis: isMultiGrid ? yAxes : yAxes[0],
        visualMap: {
            min: globalMin,
            max: globalMax,
            calculable: true,
            orient: "vertical" as const,
            right: 0,
            top: "center",
            inRange: {
                color: [
                    "#313695", // dark blue  — high OIP / low RF
                    "#4575b4",
                    "#74add1",
                    "#abd9e9",
                    "#e0f3f8",
                    "#ffffbf", // neutral
                    "#fee090",
                    "#fdae61",
                    "#f46d43",
                    "#d73027", // red        — low OIP / high RF
                    "#a50026",
                ],
            },
            formatter: (value: unknown) => formatNumber(Number(value), 3),
        },
        series: isMultiGrid ? series : series[0] ? [series[0]] : [],
        toolbox: {
            feature: {
                restore: { title: "Reset" },
            },
            right: 16,
            top: 4,
        },
    };
}
