import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";


import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ComposeChartConfig } from "../../core/composeChartOption";
import { applyActiveTimestampMarker } from "../../overlays/activeTimestampMarker";
import type {
    BaseChartOptions,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "../../types";

import { buildTimeseriesSubplotArtifacts } from "./subplotArtifacts";
import { buildTimeseriesTooltip } from "./tooltips";


export interface TimeseriesChartOptions {
    base?: BaseChartOptions;
    series: {
        subplotOverlays: TimeseriesSubplotOverlays[];
        displayConfig: TimeseriesDisplayConfig;
        yAxisLabel: string;
        memberLabel?: string;
        activeTimestampUtcMs?: number | null;
    };
}

type RealtimeAxisPointer = {
    show: true;
    type: "line";
    triggerTooltip: false;
    label: { show: true };
};

export function buildTimeseriesChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    options: TimeseriesChartOptions,
): EChartsOption {
    const baseOptions = options.base ?? {};
    const {
        subplotOverlays,
        displayConfig,
        yAxisLabel,
        memberLabel,
        activeTimestampUtcMs = null,
    } = options.series;

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
            ...baseOptions,
            postProcessAxes,
            ...buildTimeseriesComposeOverrides(
                numSubplots,
                displayConfig,
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
    // The subplot artifact builder owns the emitted series order so visual rendering
    // and interaction index generation stay coupled through a single path.
    const subplotArtifacts = buildTimeseriesSubplotArtifacts(group, subplotOverlays, axisIndex, config);

    return {
        series: subplotArtifacts.series,
        legendData: subplotArtifacts.legendData,
        xAxis: { type: "category", data: categoryData, boundaryGap: false, axisPointer: realtimePointer },
        yAxis: { type: "value", label: yAxisLabel, scale: true, splitLine: false, axisPointer: realtimePointer },
        title: group.title,
    };
}

function buildTimeseriesComposeOverrides(
    numSubplots: number,
    config: TimeseriesDisplayConfig,
    memberLabel?: string,
) {
    return {
        tooltip: buildTimeseriesTooltip(config, { memberLabel }),
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
        dataZoom: buildTimeseriesDataZoom(numSubplots),
    };
}

function buildTimeseriesDataZoom(
    numSubplots: number
): NonNullable<ComposeChartConfig["dataZoom"]> {
    const allAxisIndices = Array.from({ length: numSubplots }, (_, index) => index);

    return [
        { type: "inside" as const, id: "x", xAxisIndex: allAxisIndices, filterMode: "none" as const },
        { type: "inside" as const, id: "y", yAxisIndex: allAxisIndices, filterMode: "none" as const },
    ];
}