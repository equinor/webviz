import React from "react";

import type ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { StatisticsType, SubplotGroup } from "../../typesAndEnums";
import { VisualizationMode } from "../../typesAndEnums";
import { buildTimeseriesOptions } from "../../utils/echartsChartBuilder";
import { activeTimestampUtcMsAtom } from "../atoms/baseAtoms";

import { useChartClickToTimestamp } from "./useChartClickToTimestamp";
import { useHighlightOnHover } from "./useHighlightOnHover";

/**
 * Hook that builds ECharts options and event handlers for the timeseries chart.
 *
 * Returns everything the view needs to render the chart, plus a ref for the
 * ECharts instance so event handlers can dispatch highlight/downplay actions.
 */
export function useEchartsOptions(
    subplotGroups: SubplotGroup[],
    visualizationMode: VisualizationMode | null,
    selectedStatistics: StatisticsType[],
    yAxisLabel: string,
) {
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const showStatLines = visualizationMode !== VisualizationMode.IndividualRealizations;
    const showFanchart = visualizationMode === VisualizationMode.StatisticalFanchart;

    const chartRef = React.useRef<ReactECharts>(null);

    // ── Build echarts option object ──

    const { echartsOptions, timeseriesChartData } = React.useMemo(() => {
        return buildTimeseriesOptions(
            subplotGroups,
            showStatLines,
            showFanchart,
            selectedStatistics,
            yAxisLabel,
            activeTimestampUtcMs,
        );
    }, [subplotGroups, showStatLines, showFanchart, selectedStatistics, yAxisLabel, activeTimestampUtcMs]);

    // ── Resolve timestamps for click-to-publish ──

    const timestamps = React.useMemo(() => {
        const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
        return firstTrace?.timestamps ?? [];
    }, [subplotGroups]);

    // ── Click-to-snap timestamp selection ──

    useChartClickToTimestamp(chartRef, timestamps, activeTimestampUtcMs, setActiveTimestampUtcMs, echartsOptions);

    // ── Highlight-on-hover for individual realizations ──

    const onChartEvents = useHighlightOnHover(chartRef, !showStatLines);

    return {
        chartRef,
        echartsOptions,
        timeseriesChartData,
        onChartEvents,
    };
}
