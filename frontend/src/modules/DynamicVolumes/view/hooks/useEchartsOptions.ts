import React from "react";

import type ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { StatisticsType } from "../../typesAndEnums";
import { VisualizationMode } from "../../typesAndEnums";
import { buildTimeseriesOptions } from "../../utils/echartsTimeseriesOptions";
import type { SubplotGroup } from "../atoms/derivedAtoms";

import { activeTimestampUtcMsAtom } from "./useActiveTimestamp";

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
    const highlightedSeriesRef = React.useRef<string | null>(null);

    // ── Build echarts data from subplot groups ──

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

    // ── Canvas-level click to snap to nearest timestep ──
    // Uses the zrender layer so clicks anywhere in the plot area work,
    // not only on top of a visible data point.

    const activeTimestampRef = React.useRef(activeTimestampUtcMs);
    activeTimestampRef.current = activeTimestampUtcMs;

    const timestampsRef = React.useRef(timestamps);
    timestampsRef.current = timestamps;

    React.useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        // Attach a native DOM click handler on the chart container so it is
        // never invalidated by ECharts internal rebuilds (notMerge / zrender
        // recreation).  Inside the handler we always read the *current* chart
        // instance via the ref so coordinate conversion uses up-to-date grids.
        const dom = instance.getDom();
        if (!dom) return;

        const handleClick = (event: Event) => {
            if (!(event instanceof MouseEvent)) return;
            const chart = chartRef.current?.getEchartsInstance();
            if (!chart) return;

            const rect = (chart.getDom() ?? dom).getBoundingClientRect();
            const pixelX = event.clientX - rect.left;
            const pixelY = event.clientY - rect.top;

            const opts = chart.getOption();
            const numGrids = Array.isArray(opts.grid) ? (opts.grid as any[]).length : 1;

            for (let gridIdx = 0; gridIdx < numGrids; gridIdx++) {
                try {
                    const dataPoint = chart.convertFromPixel({ gridIndex: gridIdx }, [pixelX, pixelY]);
                    if (dataPoint == null) continue;
                    const categoryIdx = Math.round(dataPoint[0]);
                    const ts = timestampsRef.current;
                    if (categoryIdx >= 0 && categoryIdx < ts.length) {
                        const clickedTs = ts[categoryIdx];
                        setActiveTimestampUtcMs(clickedTs === activeTimestampRef.current ? null : clickedTs);
                        return;
                    }
                } catch {
                    // convertFromPixel can throw if pixel is outside this grid's range
                    continue;
                }
            }
        };

        dom.addEventListener("click", handleClick);
        return () => {
            dom.removeEventListener("click", handleClick);
        };
    }, [setActiveTimestampUtcMs, echartsOptions]); // re-attach when options change (grids may differ)

    // ── Event handlers ──

    const onChartEvents = React.useMemo(
        () => ({
            mouseover: (e: any) => {
                if (!showStatLines && e.seriesName && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    if (highlightedSeriesRef.current !== e.seriesName) {
                        instance.dispatchAction({ type: "downplay" });
                        instance.dispatchAction({
                            type: "highlight",
                            seriesName: e.seriesName,
                        });
                        highlightedSeriesRef.current = e.seriesName;
                    }
                }
            },
            mouseout: () => {
                if (!showStatLines && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    instance.dispatchAction({ type: "downplay" });
                    highlightedSeriesRef.current = null;
                }
            },
            globalout: () => {
                if (!showStatLines && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    instance.dispatchAction({ type: "downplay" });
                    highlightedSeriesRef.current = null;
                }
            },
        }),
        [showStatLines],
    );

    return {
        chartRef,
        echartsOptions,
        timeseriesChartData,
        onChartEvents,
    };
}
