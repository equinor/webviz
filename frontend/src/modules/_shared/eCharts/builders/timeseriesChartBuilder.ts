import type { EChartsOption } from "echarts";
import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { applyActiveTimestampMarker } from "../interaction/activeTimestampMarker";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "../interaction/tooltipFormatters";
import { getResponsiveFeatures } from "../layout/responsiveConfig";
import type { SubplotAxisDef } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import { buildFanchartSeries, buildRealizationsSeries, buildStatisticsSeries } from "../series";
import type { ContainerSize, SubplotGroup, TimeseriesDisplayConfig, TimeseriesTrace } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ComposeChartConfig } from "./composeChartOption";

export type TimeseriesChartResult = {
    echartsOptions: EChartsOption;
    categoryData: string[];
};

type TimeseriesChartSeries = LineSeriesOption | CustomSeriesOption;

type TimeseriesSeriesBuildResult = {
    series: TimeseriesChartSeries[];
    legendData: string[];
};

export function buildTimeseriesChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
    yAxisLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
): TimeseriesChartResult {
    const categoryData = buildCategoryData(subplotGroups);
    if (categoryData.length === 0) return { echartsOptions: {}, categoryData: [] };

    const { series, legendData } = buildTimeseriesSeries(subplotGroups, config);

    if (activeTimestampUtcMs != null) {
        applyActiveTimestampMarker(series, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
    }

    const layout = computeSubplotGridLayout(subplotGroups.length);
    const axes = buildTimeseriesAxes(layout, subplotGroups, categoryData, yAxisLabel, config);
    const echartsOptions = composeChartOption(
        layout,
        axes,
        buildTimeseriesComposeConfig(series, legendData, subplotGroups.length, config, containerSize),
    );

    return { echartsOptions, categoryData };
}

function buildCategoryData(subplotGroups: SubplotGroup<TimeseriesTrace>[]): string[] {
    const firstTrace = subplotGroups.flatMap((group) => group.traces).find((trace) => trace.timestamps.length > 0);
    return firstTrace ? firstTrace.timestamps.map((timestamp) => timestampUtcMsToCompactIsoString(timestamp)) : [];
}

function buildTimeseriesAxes(
    layout: SubplotLayoutResult,
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    categoryData: string[],
    yAxisLabel: string,
    config: TimeseriesDisplayConfig,
) {
    const realtimePointer = buildRealtimeAxisPointer(config);
    const axisDefs: SubplotAxisDef[] = subplotGroups.map((group) => ({
        xAxis: { type: "category", data: categoryData, boundaryGap: false, axisPointer: realtimePointer },
        yAxis: {
            type: "value",
            label: yAxisLabel,
            scale: true,
            splitLine: false,
            axisPointer: realtimePointer,
        },
        title: group.title,
    }));

    return buildSubplotAxes(layout, axisDefs);
}

function buildRealtimeAxisPointer(config: TimeseriesDisplayConfig) {
    const showCrosshair = config.showRealizations && !config.showStatistics;
    return showCrosshair
        ? undefined
        : { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } };
}

function buildTimeseriesComposeConfig(
    series: TimeseriesChartSeries[],
    legendData: string[],
    numSubplots: number,
    config: TimeseriesDisplayConfig,
    containerSize?: ContainerSize,
): ComposeChartConfig {
    return {
        series,
        legendData,
        containerSize,
        tooltip: buildTimeseriesTooltip(config),
        axisPointer: {
            show: true,
            type: "line",
            triggerEmphasis: false,
            triggerTooltip: false,
            label: { show: true },
            link: [{ xAxisIndex: "all" as const }],
        },
        toolbox: {
            feature: {
                dataZoom: { yAxisIndex: "none" as const, title: { zoom: "Box zoom", back: "Reset zoom" } },
                restore: { title: "Reset" },
            },
            right: 16,
            top: 4,
        },
        dataZoom: buildTimeseriesDataZoom(numSubplots, containerSize),
    };
}

function buildTimeseriesTooltip(config: TimeseriesDisplayConfig): ComposeChartConfig["tooltip"] {
    return config.showStatistics
        ? {
              trigger: "axis",
              formatter: formatStatisticsTooltip,
              axisPointer: { type: "cross" },
          }
        : {
              trigger: "item",
              formatter: formatRealizationItemTooltip,
          };
}

function buildTimeseriesDataZoom(
    numSubplots: number,
    containerSize?: ContainerSize,
): NonNullable<ComposeChartConfig["dataZoom"]> {
    const { showSliders } = getResponsiveFeatures(containerSize);
    const allAxisIndices = Array.from({ length: numSubplots }, (_, index) => index);
    const showSliderControls = numSubplots === 1 && showSliders;

    return [
        ...(showSliderControls
            ? [
                  {
                      type: "slider" as const,
                      show: true,
                      xAxisIndex: allAxisIndices,
                      start: 0,
                      end: 100,
                      bottom: 0,
                      height: 20,
                      filterMode: "none" as const,
                  },
                  {
                      type: "slider" as const,
                      show: true,
                      yAxisIndex: allAxisIndices,
                      start: 0,
                      end: 100,
                      right: -10,
                      width: 20,
                      filterMode: "none" as const,
                  },
              ]
            : []),
        { type: "inside" as const, xAxisIndex: allAxisIndices, filterMode: "none" as const },
        { type: "inside" as const, yAxisIndex: allAxisIndices, filterMode: "none" as const },
    ];
}

function buildTimeseriesSeries(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
): TimeseriesSeriesBuildResult {
    const series: TimeseriesChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (let gridIdx = 0; gridIdx < subplotGroups.length; gridIdx++) {
        const group = subplotGroups[gridIdx];
        for (const trace of group.traces) {
            if (config.showRealizations && trace.realizationValues) {
                const realizationResult = buildRealizationsSeries(trace, gridIdx);
                series.push(...realizationResult.series);
                addLegendEntry(legendData, seenLegend, realizationResult.legendEntry);
            }

            if (config.showStatistics && trace.statistics) {
                series.push(...buildStatisticsSeries(trace, config.selectedStatistics, gridIdx));
                addLegendEntry(legendData, seenLegend, trace.name);
            }

            if (config.showFanchart && trace.statistics) {
                series.push(...buildFanchartSeries(trace, config.selectedStatistics, gridIdx));
            }
        }
    }

    return { series, legendData };
}

function addLegendEntry(legendData: string[], seenLegend: Set<string>, legendEntry: string | null): void {
    if (legendEntry && !seenLegend.has(legendEntry)) {
        legendData.push(legendEntry);
        seenLegend.add(legendEntry);
    }
}
