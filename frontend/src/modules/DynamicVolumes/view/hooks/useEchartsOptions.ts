import React from "react";

import type ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { HeatmapDataset, StatisticsType, SubplotGroup } from "../../typesAndEnums";
import { VisualizationMode } from "../../typesAndEnums";
import { buildHeatmapOptions, buildTimeseriesOptions } from "../../utils/echartsChartBuilder";
import { activeTimestampUtcMsAtom } from "../atoms/baseAtoms";

import { useChartClickToTimestamp } from "./useChartClickToTimestamp";
import { useHighlightOnHover } from "./useHighlightOnHover";

/**
 * Hook that builds ECharts options and event handlers for the timeseries chart
 * or the drainage heatmap, depending on visualization mode.
 *
 * Returns everything the view needs to render the chart, plus a ref for the
 * ECharts instance so event handlers can dispatch highlight/downplay actions.
 */
export function useEchartsOptions(
    subplotGroups: SubplotGroup[],
    heatmapDatasets: HeatmapDataset[],
    visualizationMode: VisualizationMode | null,
    selectedStatistics: StatisticsType[],
    yAxisLabel: string,
) {
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const isHeatmap = visualizationMode === VisualizationMode.DrainageHeatmap;
    const showStatLines = !isHeatmap && visualizationMode !== VisualizationMode.IndividualRealizations;
    const showFanchart = visualizationMode === VisualizationMode.StatisticalFanchart;

    const chartRef = React.useRef<ReactECharts>(null);

    // ── Build echarts option object ──

    const { echartsOptions, timeseriesChartData } = React.useMemo(() => {
        if (isHeatmap) {
            return {
                echartsOptions: buildHeatmapOptions(heatmapDatasets, yAxisLabel, activeTimestampUtcMs),
                timeseriesChartData: heatmapDatasets.length > 0 ? heatmapDatasets[0].xLabels : [],
            };
        }

        return buildTimeseriesOptions(
            subplotGroups,
            showStatLines,
            showFanchart,
            selectedStatistics,
            yAxisLabel,
            activeTimestampUtcMs,
        );
    }, [
        isHeatmap,
        heatmapDatasets,
        subplotGroups,
        showStatLines,
        showFanchart,
        selectedStatistics,
        yAxisLabel,
        activeTimestampUtcMs,
    ]);

    // ── Resolve timestamps for click-to-publish ──

    const timestamps = React.useMemo(() => {
        if (isHeatmap) {
            return heatmapDatasets.length > 0 ? heatmapDatasets[0].timestampsUtcMs : [];
        }
        const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
        return firstTrace?.timestamps ?? [];
    }, [isHeatmap, heatmapDatasets, subplotGroups]);

    // ── Click-to-snap timestamp selection ──

    useChartClickToTimestamp(chartRef, timestamps, activeTimestampUtcMs, setActiveTimestampUtcMs, echartsOptions);

    // ── Highlight-on-hover for individual realizations (timeseries only) ──

    const onChartEvents = useHighlightOnHover(chartRef, !isHeatmap && !showStatLines);

    return {
        chartRef,
        echartsOptions,
        timeseriesChartData,
        onChartEvents,
    };
}
