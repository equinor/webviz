import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { applyActiveTimestampMarker } from "../interaction/activeTimestampMarker";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "../interaction/tooltipFormatters";
import { getResponsiveFeatures } from "../layout/responsiveConfig";
import { buildFanchartSeries, buildRealizationsSeries, buildStatisticsSeries } from "../series";
import type { ContainerSize, SubplotGroup, TimeseriesDisplayConfig, TimeseriesTrace } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";
import type { ComposeChartConfig } from "./composeChartOption";

export type TimeseriesChartOptions = {
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

type RealtimeAxisPointer = {
    show: true;
    type: "line";
    triggerTooltip: false;
    label: { show: true };
};

export function buildTimeseriesChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
    yAxisLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
    chartOptions: TimeseriesChartOptions = {},
): EChartsOption {
    const categoryData = buildCategoryData(subplotGroups);
    if (categoryData.length === 0) return {};

    const realtimePointer = buildRealtimeAxisPointer(config);
    const numSubplots = subplotGroups.length;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) =>
            buildTimeseriesSubplot(group, axisIndex, config, categoryData, yAxisLabel, realtimePointer),
        {
            containerSize,
            sharedXAxis: chartOptions.sharedXAxis,
            sharedYAxis: chartOptions.sharedYAxis,
            postProcessAxes: (_axes, allSeries) => {
                if (activeTimestampUtcMs != null) {
                    applyActiveTimestampMarker(allSeries, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
                }
            },
            ...buildTimeseriesComposeOverrides(numSubplots, config, containerSize),
        },
    );
}

/**
 * Extract the category (date) strings from timeseries subplot groups.
 * Useful for consumers that need the category data alongside the chart option.
 */
export function extractTimeseriesCategoryData(subplotGroups: SubplotGroup<TimeseriesTrace>[]): string[] {
    return buildCategoryData(subplotGroups);
}

function buildCategoryData(subplotGroups: SubplotGroup<TimeseriesTrace>[]): string[] {
    const firstTrace = subplotGroups.flatMap((group) => group.traces).find((trace) => trace.timestamps.length > 0);
    return firstTrace ? firstTrace.timestamps.map((timestamp) => timestampUtcMsToCompactIsoString(timestamp)) : [];
}

function buildRealtimeAxisPointer(config: TimeseriesDisplayConfig): RealtimeAxisPointer | undefined {
    const showCrosshair = config.showRealizations && !config.showStatistics;
    return showCrosshair
        ? undefined
        : { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } };
}

function buildTimeseriesSubplot(
    group: SubplotGroup<TimeseriesTrace>,
    axisIndex: number,
    config: TimeseriesDisplayConfig,
    categoryData: string[],
    yAxisLabel: string,
    realtimePointer: RealtimeAxisPointer | undefined,
): CartesianSubplotBuildResult {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        if (config.showRealizations && trace.realizationValues) {
            const realizationResult = buildRealizationsSeries(trace, axisIndex);
            series.push(...realizationResult.series);
            addLegendEntries(legendData, seenLegend, realizationResult.legendData);
        }

        if (config.showStatistics && trace.statistics) {
            const statisticsResult = buildStatisticsSeries(trace, config.selectedStatistics, axisIndex);
            series.push(...statisticsResult.series);
            addLegendEntries(legendData, seenLegend, statisticsResult.legendData);
        }

        if (config.showFanchart && trace.statistics) {
            const fanchartResult = buildFanchartSeries(trace, config.selectedStatistics, axisIndex);
            series.push(...fanchartResult.series);
            addLegendEntries(legendData, seenLegend, fanchartResult.legendData);
        }
    }

    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryData, boundaryGap: false, axisPointer: realtimePointer },
        yAxis: { type: "value", label: yAxisLabel, scale: true, splitLine: false, axisPointer: realtimePointer },
        title: group.title,
    };
}

function buildTimeseriesComposeOverrides(
    numSubplots: number,
    config: TimeseriesDisplayConfig,
    containerSize?: ContainerSize,
) {
    return {
        tooltip: buildTimeseriesTooltip(config),
        axisPointer: {
            show: true,
            type: "line" as const,
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
                      height: 10,
                      filterMode: "none" as const,
                  },
                  {
                      type: "slider" as const,
                      show: true,
                      yAxisIndex: allAxisIndices,
                      start: 0,
                      end: 100,
                      right: 0,
                      width: 10,
                      filterMode: "none" as const,
                  },
              ]
            : []),
        { type: "inside" as const, xAxisIndex: allAxisIndices, filterMode: "none" as const },
        { type: "inside" as const, yAxisIndex: allAxisIndices, filterMode: "none" as const },
    ];
}

function addLegendEntries(legendData: string[], seenLegend: Set<string>, entries: string[]): void {
    for (const entry of entries) {
        if (entry && !seenLegend.has(entry)) {
            legendData.push(entry);
            seenLegend.add(entry);
        }
    }
}
