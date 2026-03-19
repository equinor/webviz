import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ComposeChartConfig } from "../../core/composeChartOption";
import { getResponsiveFeatures } from "../../layout/responsiveConfig";
import { applyActiveTimestampMarker } from "../../overlays/activeTimestampMarker";
import type {
    ContainerSize,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "../../types";

import { buildHistorySeries } from "./historySeries";
import { buildMemberSeries } from "./memberSeries";
import { buildObservationSeries } from "./observationSeries";
import { buildStatisticsSeries, buildFanchartSeries } from "./statisticsSeries";
import { buildTimeseriesTooltip } from "./tooltips";

export type TimeseriesChartOptions = {
    subplotOverlays: TimeseriesSubplotOverlays[];
    displayConfig: TimeseriesDisplayConfig;
    yAxisLabel: string;
    memberLabel?: string;
    activeTimestampUtcMs?: number | null;
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
    options: TimeseriesChartOptions,
    containerSize?: ContainerSize,
): EChartsOption {
    const {
        subplotOverlays,
        displayConfig,
        yAxisLabel,
        memberLabel,
        activeTimestampUtcMs = null,
        sharedXAxis,
        sharedYAxis,
    } = options;

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

    const realtimePointer = buildRealtimeAxisPointer(displayConfig);
    const numSubplots = nonEmptySubplotGroups.length;

    const buildSubplot = function buildTimeseriesSubplotForAxis(
        group: SubplotGroup<TimeseriesTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildTimeseriesSubplot(
            group,
            nonEmptySubplotOverlays[axisIndex],
            axisIndex,
            displayConfig,
            categoryData,
            yAxisLabel,
            realtimePointer,
        );
    };

    const postProcessAxes = function postProcessAxesForActiveTimestamp(
        _axes: unknown,
        allSeries: CartesianChartSeries[],
    ): void {
        if (activeTimestampUtcMs == null) return;

        applyActiveTimestampMarker(allSeries, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
    };

    return buildCartesianSubplotChart(
        nonEmptySubplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            postProcessAxes,
            ...buildTimeseriesComposeOverrides(
                numSubplots,
                displayConfig,
                containerSize,
                memberLabel,
            ),
        },
    );
}

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
            const memberResult = buildMemberSeries(trace, axisIndex);
            series.push(...memberResult.series);
            addLegendEntries(legendData, seenLegend, memberResult.legendData);
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
    memberLabel?: string,
) {
    return {
        tooltip: buildTimeseriesTooltip(config, { memberLabel }), // No context map!
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