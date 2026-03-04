import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { StatisticsType } from "../typesAndEnums";
import type { SubplotGroup } from "../view/atoms/derivedAtoms";
import { formatDate } from "../view/atoms/derivedAtoms";

import { buildRealizationsSeries } from "./echartsRealizationsSeries";
import { buildFanchartSeries, buildStatisticsSeries } from "./echartsStatisticsSeries";

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
                // One legend entry per trace label
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
    // Add a vertical markLine on the first series of each grid so the
    // selected timestep is visible across all subplots.
    if (activeTimestampUtcMs != null) {
        const activeDate = formatDate(activeTimestampUtcMs);
        const seenGrids = new Set<number>();
        for (const s of allSeries) {
            const gridIdx = s.xAxisIndex ?? 0;
            if (seenGrids.has(gridIdx)) continue;
            // Skip fanchart helper series (they are custom type, not ideal for markLine)
            if (typeof s.name === "string" && s.name.includes("_fan_")) continue;
            seenGrids.add(gridIdx);
            s.markLine = {
                silent: true,
                symbol: "none",
                animation: false,
                lineStyle: { type: "solid", color: "#333", width: 1.5 },
                label: {
                    show: true,
                    formatter: activeDate,
                    position: "insideEndTop",
                    fontSize: 10,
                    color: "#333",
                },
                data: [{ xAxis: activeDate }],
            };
        }
    }

    // ── Grid layout ──

    const MARGIN_LEFT_PCT = 2;
    const MARGIN_RIGHT_PCT = 2;
    const BOTTOM_SPACE_PCT = 8; // datazoom + labels
    const TOP_SPACE_PCT = 4;

    // Determine grid dimensions: prefer roughly square cells, max 4 columns
    const numCols = isMultiGrid ? Math.min(numSubplots, Math.ceil(Math.sqrt(numSubplots)), 4) : 1;
    const numRows = Math.ceil(numSubplots / numCols);

    // Scale gaps down as the grid gets denser so margins don't dominate with many plots
    const GAP_X_PCT = isMultiGrid ? Math.max(2, 6 / Math.sqrt(numCols)) : 0;
    const GAP_Y_PCT = isMultiGrid ? Math.max(2, 8 / Math.sqrt(numRows)) : 0;
    const TITLE_HEIGHT_PCT = isMultiGrid ? Math.max(1, 3 / Math.sqrt(numRows)) : 0;

    const availableWidth = 100 - MARGIN_LEFT_PCT - MARGIN_RIGHT_PCT - (numCols - 1) * GAP_X_PCT;
    const availableHeight =
        100 - TOP_SPACE_PCT - BOTTOM_SPACE_PCT - (numRows - 1) * GAP_Y_PCT - numRows * TITLE_HEIGHT_PCT;
    const cellWidth = availableWidth / numCols;
    const cellHeight = availableHeight / numRows;

    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const titles: any[] = [];

    for (let i = 0; i < numSubplots; i++) {
        const row = Math.floor(i / numCols);
        const col = i % numCols;

        const leftPct = MARGIN_LEFT_PCT + col * (cellWidth + GAP_X_PCT);
        const topPct = TOP_SPACE_PCT + row * (cellHeight + GAP_Y_PCT + TITLE_HEIGHT_PCT) + TITLE_HEIGHT_PCT;

        grids.push({
            top: `${topPct}%`,
            left: `${leftPct}%`,
            width: `${cellWidth}%`,
            height: `${cellHeight}%`,
            containLabel: true,
        });

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
                left: `${leftPct + cellWidth / 2}%`,
                top: `${topPct - TITLE_HEIGHT_PCT}%`,
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
            ? grids
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
            // Slider controls only shown for single subplot — they don't map well to multi-grid
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
                          right: 10,
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

// ── Tooltip formatters ──

function formatStatisticsTooltip(params: any): string {
    if (!params?.length) return "";
    const date = params[0].axisValue;
    let out = `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${date}</div>`;
    for (const p of params) {
        // Skip fanchart helper series
        if (typeof p.seriesName === "string" && p.seriesName.includes("_fan_")) continue;
        // Extract stat type from series id (format: "label_StatType_gridIdx")
        let statSuffix = "";
        if (typeof p.seriesId === "string") {
            const idParts = p.seriesId.split("_");
            // stat type is the second-to-last part (before gridIdx)
            if (idParts.length >= 3) {
                statSuffix = ` (${idParts[idParts.length - 2]})`;
            }
        }
        out +=
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `<span style="color:${p.color}">${p.seriesName}${statSuffix}</span>` +
            `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`;
    }
    return out;
}

function formatRealizationItemTooltip(params: any): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";
    const matchReal = p.seriesName?.match(/_real_(\d+)$/);
    const name = matchReal ? `Realization ${matchReal[1]}` : p.seriesName;
    return (
        `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${p.name}</div>` +
        `<div style="display:flex;justify-content:space-between;gap:12px">` +
        `<span style="color:${p.color}">${name}</span>` +
        `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`
    );
}
