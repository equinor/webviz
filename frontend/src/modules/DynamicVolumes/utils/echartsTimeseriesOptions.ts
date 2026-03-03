import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { StatisticsType } from "../typesAndEnums";
import type { ChartTrace } from "../view/atoms/derivedAtoms";
import { formatDate } from "../view/atoms/derivedAtoms";

import { buildRealizationsSeries } from "./echartsRealizationsSeries";
import { buildFanchartSeries, buildStatisticsSeries } from "./echartsStatisticsSeries";

export type TimeseriesEchartsResult = {
    echartsOptions: EChartsOption;
    timeseriesChartData: string[];
};

/** Assemble a full EChartsOption for timeseries (statistics or realizations). */
export function buildTimeseriesOptions(
    chartTraces: ChartTrace[],
    showStatLines: boolean,
    showFanchart: boolean,
    selectedStatistics: StatisticsType[],
    yAxisLabel: string,
): TimeseriesEchartsResult {
    if (chartTraces.length === 0) return { echartsOptions: {}, timeseriesChartData: [] };

    const firstTrace = chartTraces[0];
    if (!firstTrace.timestamps.length) return { echartsOptions: {}, timeseriesChartData: [] };

    const xAxisData = firstTrace.timestamps.map((ts) => formatDate(ts));

    // ── Collect series from sub-builders ──

    const allSeries: any[] = [];
    const legendData: string[] = [];

    for (const trace of chartTraces) {
        if (showStatLines && trace.stats) {
            allSeries.push(...buildStatisticsSeries(trace, selectedStatistics));
            if (
                showFanchart &&
                selectedStatistics.includes(StatisticsType.P10) &&
                selectedStatistics.includes(StatisticsType.P90)
            ) {
                allSeries.push(...buildFanchartSeries(trace));
            }
        } else if (trace.aggregatedValues) {
            const { series, legendEntry } = buildRealizationsSeries(trace);
            allSeries.push(...series);
            if (legendEntry) legendData.push(legendEntry);
        }
    }

    // ── Compose option ──

    const echartsOptions: EChartsOption = {
        animation: false,
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
        // Show crosshair independently of tooltip for realizations mode
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
        legend: { show: true, data: showStatLines ? undefined : legendData },
        grid: { top: 30, right: 60, bottom: 50, left: 60, containLabel: true },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: xAxisData,
            axisLabel: { fontSize: 11 },
            ...(showStatLines ? {} : { axisPointer: { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } } }),
        },
        yAxis: {
            type: "value",
            name: yAxisLabel,
            nameLocation: "middle",
            nameGap: 40,
            axisLabel: { fontSize: 11, formatter: (v: number) => formatNumber(v) },
            ...(showStatLines ? {} : { axisPointer: { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } } }),
        },
        series: allSeries,
        dataZoom: [
            { type: "slider", show: true, xAxisIndex: [0], start: 0, end: 100, bottom: 0, height: 20, filterMode: "none" },
            { type: "slider", show: true, yAxisIndex: [0], start: 0, end: 100, right: 10, width: 20, filterMode: "none" },
            { type: "inside", xAxisIndex: [0], filterMode: "none" },
            { type: "inside", yAxisIndex: [0], filterMode: "none" },
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
        if (p.seriesName.includes("Base") || p.seriesName.includes("P10-P90")) continue;
        out +=
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `<span style="color:${p.color}">${p.seriesName}</span>` +
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
