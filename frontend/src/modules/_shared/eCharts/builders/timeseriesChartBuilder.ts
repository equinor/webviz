import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { applyActiveTimestampMarker } from "../interaction/activeTimestampMarker";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "../interaction/tooltipTimeseriesFormatters";
import { getResponsiveFeatures } from "../layout/responsiveConfig";
import {
    buildFanchartSeries,
    buildHistorySeries,
    buildObservationSeries,
    buildRealizationsSeries,
    buildStatisticsSeries,
} from "../series";
import type {
    ContainerSize,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "../types";

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
    subplotOverlays: TimeseriesSubplotOverlays[],
    config: TimeseriesDisplayConfig,
    yAxisLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
    chartOptions: TimeseriesChartOptions = {},
): EChartsOption {
    if (subplotOverlays.length !== subplotGroups.length) {
        throw new Error("Timeseries subplot overlays must match the number of subplot groups.");
    }

    const groupedData = subplotGroups.map((group, index) => ({
        group,
        overlays: subplotOverlays[index],
    }));

    const nonEmptyGroupedData = groupedData.filter((entry) => entry.group.traces.length > 0);
    const nonEmptySubplotGroups = nonEmptyGroupedData.map((entry) => entry.group);
    const nonEmptySubplotOverlays = nonEmptyGroupedData.map((entry) => entry.overlays);

    const categoryData = buildCategoryData(nonEmptySubplotGroups);
    if (categoryData.length === 0) return {};

    const realtimePointer = buildRealtimeAxisPointer(config);
    const numSubplots = nonEmptySubplotGroups.length;
    const buildSubplot = createTimeseriesSubplotBuilder(
        nonEmptySubplotOverlays,
        config,
        categoryData,
        yAxisLabel,
        realtimePointer,
    );
    const postProcessAxes = createTimeseriesPostProcessAxes(activeTimestampUtcMs);

    return buildCartesianSubplotChart(
        nonEmptySubplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis: chartOptions.sharedXAxis,
            sharedYAxis: chartOptions.sharedYAxis,
            postProcessAxes,
            ...buildTimeseriesComposeOverrides(numSubplots, config, containerSize),
        },
    );
}

function createTimeseriesSubplotBuilder(
    subplotOverlays: TimeseriesSubplotOverlays[],
    config: TimeseriesDisplayConfig,
    categoryData: string[],
    yAxisLabel: string,
    realtimePointer: RealtimeAxisPointer | undefined,
): (group: SubplotGroup<TimeseriesTrace>, axisIndex: number) => CartesianSubplotBuildResult {
    return function buildTimeseriesSubplotForAxis(group, axisIndex): CartesianSubplotBuildResult {
        return buildTimeseriesSubplot(
            group,
            subplotOverlays[axisIndex],
            axisIndex,
            config,
            categoryData,
            yAxisLabel,
            realtimePointer,
        );
    };
}

function createTimeseriesPostProcessAxes(
    activeTimestampUtcMs: number | null,
): (_axes: unknown, allSeries: CartesianChartSeries[]) => void {
    return function postProcessAxesForActiveTimestamp(_axes, allSeries): void {
        if (activeTimestampUtcMs == null) return;

        applyActiveTimestampMarker(allSeries, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
    };
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
    subplotOverlays: TimeseriesSubplotOverlays,
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

    if (config.showHistorical) {
        for (const historicalTrace of subplotOverlays.historicalTraces) {
            const historyResult = buildHistorySeries(historicalTrace, axisIndex);
            series.push(...historyResult.series);
            addLegendEntries(legendData, seenLegend, historyResult.legendData);
        }
    }

    if (config.showObservations) {
        for (const observationTrace of subplotOverlays.observationTraces) {
            const observationResult = buildObservationSeries(observationTrace, axisIndex);
            series.push(...observationResult.series);
            addLegendEntries(legendData, seenLegend, observationResult.legendData);
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
