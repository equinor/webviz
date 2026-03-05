import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { StatisticsType } from "../../typesAndEnums";
import type { SubplotGroup } from "../../typesAndEnums";

import { applyActiveTimestampMarker } from "./activeTimestampMarker";
import { buildRealizationsSeries } from "./realizationsSeries";
import { buildFanchartSeries, buildStatisticsSeries } from "./statisticsSeries";
import type { SubplotCell, SubplotLayoutResult } from "./subplotGridLayout";
import { DEFAULT_LAYOUT_CONFIG, computeSubplotGridLayout } from "./subplotGridLayout";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "./tooltipFormatters";

export type TimeseriesEchartsResult = {
    echartsOptions: EChartsOption;
    timeseriesChartData: string[];
};

// ── Helper: Build all series + legend for every subplot group ──

function buildSubplotSeries(
    subplotGroups: SubplotGroup[],
    showStatLines: boolean,
    showFanchart: boolean,
    selectedStatistics: StatisticsType[],
): { allSeries: any[]; legendData: string[] } {
    const allSeries: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (let gridIdx = 0; gridIdx < subplotGroups.length; gridIdx++) {
        const group = subplotGroups[gridIdx];
        for (const trace of group.traces) {
            if (showStatLines && trace.stats) {
                allSeries.push(...buildStatisticsSeries(trace, selectedStatistics, gridIdx));
                if (
                    showFanchart &&
                    ((selectedStatistics.includes(StatisticsType.P10) &&
                        selectedStatistics.includes(StatisticsType.P90)) ||
                        (selectedStatistics.includes(StatisticsType.Min) &&
                            selectedStatistics.includes(StatisticsType.Max)))
                ) {
                    allSeries.push(...buildFanchartSeries(trace, selectedStatistics, gridIdx));
                }
                if (!seenLegend.has(trace.label)) {
                    legendData.push(trace.label);
                    seenLegend.add(trace.label);
                }
            } else if (trace.aggregatedValues) {
                const { series, legendEntry } = buildRealizationsSeries(trace, gridIdx);
                allSeries.push(...series);
                if (legendEntry && !seenLegend.has(legendEntry)) {
                    legendData.push(legendEntry);
                    seenLegend.add(legendEntry);
                }
            }
        }
    }

    return { allSeries, legendData };
}

// ── Helper: Build x/y axes and subplot titles from layout cells ──

function buildAxesAndTitles(
    cells: SubplotCell[],
    subplotGroups: SubplotGroup[],
    xAxisData: string[],
    yAxisLabel: string,
    isMultiGrid: boolean,
    showStatLines: boolean,
): { xAxes: any[]; yAxes: any[]; titles: any[] } {
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const titles: any[] = [];

    const realtimePointer = showStatLines
        ? {}
        : {
              axisPointer: {
                  show: true,
                  type: "line" as const,
                  triggerTooltip: false,
                  label: { show: true },
              },
          };

    for (const cell of cells) {
        const i = cell.gridIndex;

        xAxes.push({
            type: "category",
            gridIndex: i,
            boundaryGap: false,
            data: xAxisData,
            axisLabel: { show: true, fontSize: 11 },
            axisTick: { show: true },
            ...realtimePointer,
        });

        yAxes.push({
            type: "value",
            gridIndex: i,
            scale: true,
            name: !isMultiGrid ? yAxisLabel : "",
            nameLocation: "middle" as const,
            nameGap: 40,
            splitLine: { show: false },
            axisLabel: { show: true, fontSize: 11, formatter: (v: number) => formatNumber(v) },
            ...realtimePointer,
        });

        if (isMultiGrid && subplotGroups[i].title) {
            titles.push({
                text: subplotGroups[i].title,
                left: `${cell.leftPct + cell.widthPct / 2}%`,
                top: `${cell.titleTopPct}%`,
                textAlign: "center" as const,
                textStyle: { fontSize: 12, fontWeight: "normal" as const, color: "#555" },
            });
        }
    }

    return { xAxes, yAxes, titles };
}

// ── Helper: Compose final ECharts option object ──

function composeEchartsOption(
    allSeries: any[],
    legendData: string[],
    xAxes: any[],
    yAxes: any[],
    titles: any[],
    layout: SubplotLayoutResult,
    numSubplots: number,
    showStatLines: boolean,
): EChartsOption {
    const isMultiGrid = numSubplots > 1;
    const allXAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);
    const allYAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);

    return {
        animation: false,

        title: titles.length > 0 ? titles : undefined,
        tooltip: showStatLines
            ? {
                  trigger: "axis" as const,
                  formatter: formatStatisticsTooltip,
                  axisPointer: { type: "cross" as const },
              }
            : {
                  trigger: "item" as const,
                  formatter: formatRealizationItemTooltip,
              },
        // Show crosshair independently of tooltip for realizations mode + link axes
        ...(showStatLines
            ? {}
            : {
                  axisPointer: {
                      show: true,
                      type: "line" as const,
                      triggerEmphasis: false,
                      triggerTooltip: false,
                      label: { show: true },
                      link: [{ xAxisIndex: "all" as any }],
                  },
              }),
        legend: { show: true, data: legendData },
        grid: isMultiGrid
            ? layout.grids
            : {
                  top: `${DEFAULT_LAYOUT_CONFIG.topSpacePct}%`,
                  right: `${DEFAULT_LAYOUT_CONFIG.marginRightPct}%`,
                  bottom: `${DEFAULT_LAYOUT_CONFIG.bottomSpacePct}%`,
                  left: `${DEFAULT_LAYOUT_CONFIG.marginLeftPct}%`,
                  containLabel: true,
              },
        xAxis: isMultiGrid ? xAxes : xAxes[0],
        yAxis: isMultiGrid ? yAxes : yAxes[0],
        series: allSeries,
        dataZoom: [
            ...(isMultiGrid
                ? []
                : [
                      {
                          type: "slider" as const,
                          show: true,
                          xAxisIndex: allXAxisIndices,
                          start: 0,
                          end: 100,
                          bottom: 0,
                          height: 20,
                          filterMode: "none" as const,
                      },
                      {
                          type: "slider" as const,
                          show: true,
                          yAxisIndex: allYAxisIndices,
                          start: 0,
                          end: 100,
                          right: -10,
                          width: 20,
                          filterMode: "none" as const,
                      },
                  ]),
            { type: "inside", xAxisIndex: allXAxisIndices, filterMode: "none" },
            { type: "inside", yAxisIndex: allYAxisIndices, filterMode: "none" },
        ],
        toolbox: {
            feature: {
                dataZoom: { yAxisIndex: "none" as any, title: { zoom: "Box zoom", back: "Reset zoom" } },
                restore: { title: "Reset" },
            },
            right: 16,
            top: 4,
        },
    };
}

/** Assemble a full EChartsOption for timeseries with optional multi-grid subplots. */
export function buildTimeseriesOptions(
    subplotGroups: SubplotGroup[],
    showStatLines: boolean,
    showFanchart: boolean,
    selectedStatistics: StatisticsType[],
    yAxisLabel: string,
    activeTimestampUtcMs: number | null = null,
): TimeseriesEchartsResult {
    if (subplotGroups.length === 0) return { echartsOptions: {}, timeseriesChartData: [] };

    const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
    if (!firstTrace) return { echartsOptions: {}, timeseriesChartData: [] };

    const xAxisData = firstTrace.timestamps.map((ts) => timestampUtcMsToCompactIsoString(ts));
    const numSubplots = subplotGroups.length;
    const isMultiGrid = numSubplots > 1;

    // 1. Series + legend
    const { allSeries, legendData } = buildSubplotSeries(
        subplotGroups,
        showStatLines,
        showFanchart,
        selectedStatistics,
    );

    // 2. Active timestamp marker
    if (activeTimestampUtcMs != null) {
        applyActiveTimestampMarker(allSeries, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
    }

    // 3. Layout, axes, titles
    const layout = computeSubplotGridLayout(numSubplots);
    const { xAxes, yAxes, titles } = buildAxesAndTitles(
        layout.cells,
        subplotGroups,
        xAxisData,
        yAxisLabel,
        isMultiGrid,
        showStatLines,
    );

    // 4. Final option
    const echartsOptions = composeEchartsOption(
        allSeries,
        legendData,
        xAxes,
        yAxes,
        titles,
        layout,
        numSubplots,
        showStatLines,
    );

    return { echartsOptions, timeseriesChartData: xAxisData };
}
