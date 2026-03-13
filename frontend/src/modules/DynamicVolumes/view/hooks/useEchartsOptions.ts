import React from "react";

import type ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import {
    buildHeatmapChart,
    buildTimeseriesChart,
    useClickToTimestamp,
    useHighlightOnHover,
} from "@modules/_shared/eCharts";
import type {
    ContainerSize,
    HeatmapTrace,
    SubplotGroup as SharedSubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesTrace,
} from "@modules/_shared/eCharts";

import type { ChartTrace, HeatmapDataset, StatisticsType, SubplotGroup } from "../../typesAndEnums";
import { VisualizationMode } from "../../typesAndEnums";
import { activeTimestampUtcMsAtom } from "../atoms/baseAtoms";

function toTimeseriesTrace(t: ChartTrace): TimeseriesTrace {
    return {
        name: t.label,
        color: t.color,
        timestamps: t.timestamps,
        realizationValues: t.aggregatedValues ?? undefined,
        realizationIds: t.realizations.length > 0 ? t.realizations : undefined,
        statistics: t.stats ?? undefined,
    };
}

function toSharedSubplotGroups(groups: SubplotGroup[]): SharedSubplotGroup<TimeseriesTrace>[] {
    return groups.map((g) => ({
        title: g.title,
        traces: g.traces.map(toTimeseriesTrace),
    }));
}

function toHeatmapSubplotGroups(datasets: HeatmapDataset[]): SharedSubplotGroup<HeatmapTrace>[] {
    return [
        {
            title: "",
            traces: datasets.map((ds) => ({
                name: ds.ensembleTitle,
                xLabels: ds.xLabels,
                yLabels: ds.yLabels,
                timestampsUtcMs: ds.timestampsUtcMs,
                data: ds.data,
                minValue: ds.minValue,
                maxValue: ds.maxValue,
            })),
        },
    ];
}

export function useEchartsOptions(
    subplotGroups: SubplotGroup[],
    heatmapDatasets: HeatmapDataset[],
    visualizationMode: VisualizationMode | null,
    selectedStatistics: StatisticsType[],
    yAxisLabel: string,
    containerSize?: ContainerSize,
) {
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const isHeatmap = visualizationMode === VisualizationMode.DrainageHeatmap;
    const showStatLines = !isHeatmap && visualizationMode !== VisualizationMode.IndividualRealizations;
    const showFanchart = visualizationMode === VisualizationMode.StatisticalFanchart;
    const showRealizations = !isHeatmap && !showStatLines;

    const chartRef = React.useRef<ReactECharts>(null);

    const displayConfig: TimeseriesDisplayConfig = React.useMemo(
        () => ({
            showRealizations,
            showStatistics: showStatLines,
            showFanchart,
            selectedStatistics: selectedStatistics as unknown as TimeseriesDisplayConfig["selectedStatistics"],
        }),
        [showRealizations, showStatLines, showFanchart, selectedStatistics],
    );

    const { echartsOptions, timeseriesChartData } = React.useMemo(() => {
        if (isHeatmap) {
            const heatmapGroups = toHeatmapSubplotGroups(heatmapDatasets);
            return {
                echartsOptions: buildHeatmapChart(heatmapGroups, yAxisLabel, activeTimestampUtcMs, containerSize),
                timeseriesChartData: heatmapDatasets.length > 0 ? heatmapDatasets[0].xLabels : [],
            };
        }

        const sharedGroups = toSharedSubplotGroups(subplotGroups);
        const result = buildTimeseriesChart(
            sharedGroups,
            displayConfig,
            yAxisLabel,
            activeTimestampUtcMs,
            containerSize,
        );
        return {
            echartsOptions: result.echartsOptions,
            timeseriesChartData: result.categoryData,
        };
    }, [isHeatmap, heatmapDatasets, subplotGroups, displayConfig, yAxisLabel, activeTimestampUtcMs, containerSize]);

    const timestamps = React.useMemo(() => {
        if (isHeatmap) {
            return heatmapDatasets.length > 0 ? heatmapDatasets[0].timestampsUtcMs : [];
        }
        const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
        return firstTrace?.timestamps ?? [];
    }, [isHeatmap, heatmapDatasets, subplotGroups]);

    useClickToTimestamp(chartRef, timestamps, activeTimestampUtcMs, setActiveTimestampUtcMs, echartsOptions);

    const onChartEvents = useHighlightOnHover(chartRef, !isHeatmap && showRealizations);

    return {
        chartRef,
        echartsOptions,
        timeseriesChartData,
        availableTimestamps: timestamps,
        onChartEvents,
    };
}
