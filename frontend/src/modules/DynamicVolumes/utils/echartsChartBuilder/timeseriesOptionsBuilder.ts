import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { StatisticsType } from "../../typesAndEnums";
import type { SubplotGroup } from "../../typesAndEnums";
import { formatDate } from "../formatting";

import { applyActiveTimestampMarker } from "./activeTimestampMarker";
import { buildRealizationsSeries } from "./realizationsSeries";
import { buildFanchartSeries, buildStatisticsSeries } from "./statisticsSeries";
import { computeSubplotGridLayout } from "./subplotGridLayout";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "./tooltipFormatters";

export type TimeseriesEchartsResult = {
    echartsOptions: EChartsOption;
    timeseriesChartData: string[];
};

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

    // Find first valid timestamps from any trace
    const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
    if (!firstTrace) return { echartsOptions: {}, timeseriesChartData: [] };

    const xAxisData = firstTrace.timestamps.map((ts) => formatDate(ts));
    const numSubplots = subplotGroups.length;
    const isMultiGrid = numSubplots > 1;

    // ── Build series for each subplot ──

    const allSeries: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (let gridIdx = 0; gridIdx < numSubplots; gridIdx++) {
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

    // ── Active timestamp marker line ──

    if (activeTimestampUtcMs != null) {
        applyActiveTimestampMarker(allSeries, formatDate(activeTimestampUtcMs));
    }

    // ── Grid layout (via general-purpose calculator) ──

    const layout = computeSubplotGridLayout(numSubplots);
    const MARGIN_LEFT_PCT = 2;
    const MARGIN_RIGHT_PCT = 5;
    const BOTTOM_SPACE_PCT = 8;
    const TOP_SPACE_PCT = 4;

    // Build axes and titles from the layout cells
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const titles: any[] = [];

    for (const cell of layout.cells) {
        const i = cell.gridIndex;

        xAxes.push({
            type: "category",
            gridIndex: i,
            boundaryGap: false,
            data: xAxisData,
            axisLabel: { show: true, fontSize: 11 },
            axisTick: { show: true },
            ...(showStatLines
                ? {}
                : {
                      axisPointer: {
                          show: true,
                          type: "line" as const,
                          triggerTooltip: false,
                          label: { show: true },
                      },
                  }),
        });

        yAxes.push({
            type: "value",
            gridIndex: i,
            name: !isMultiGrid ? yAxisLabel : "",
            nameLocation: "middle" as const,
            nameGap: 40,
            splitLine: { show: false },
            axisLabel: { show: true, fontSize: 11, formatter: (v: number) => formatNumber(v) },
            ...(showStatLines
                ? {}
                : {
                      axisPointer: {
                          show: true,
                          type: "line" as const,
                          triggerTooltip: false,
                          label: { show: true },
                      },
                  }),
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

    // ── DataZoom — link all x-axes ──

    const allXAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);
    const allYAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);

    // ── Compose option ──

    const echartsOptions: EChartsOption = {
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
                  top: `${TOP_SPACE_PCT}%`,
                  right: `${MARGIN_RIGHT_PCT}%`,
                  bottom: `${BOTTOM_SPACE_PCT}%`,
                  left: `${MARGIN_LEFT_PCT}%`,
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

    return { echartsOptions, timeseriesChartData: xAxisData };
}
