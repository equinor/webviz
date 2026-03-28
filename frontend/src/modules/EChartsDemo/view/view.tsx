import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { HoveredSeriesInfo } from "@modules/_shared/eCharts";
import { computeSubplotGridLayout, useChartZoomSync, useClickToTimestamp, useSeriesInteraction } from "@modules/_shared/eCharts";

import type { Interfaces } from "../interfaces";
import { PLOT_TYPE_LABELS, PlotType } from "../typesAndEnums";

import { chartZoomAtom } from "./atoms/baseAtoms";
import { createHoveredSeriesStore, HoveredSeriesReadout } from "./hoveredSeriesReadout";
import { useDemoPlotModel } from "./useEcharts";

const ROW_HEIGHT_PX = 350;

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(containerRef);
    const chartRef = React.useRef<ReactECharts>(null);
    const hoveredSeriesStore = React.useMemo(createHoveredSeriesStore, []);
    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);

    const [viewState, setViewState] = useAtom(chartZoomAtom);
    const { appliedZoomState, handleDataZoom } = useChartZoomSync(viewState, setViewState);

    const chartModel = useDemoPlotModel(viewContext, containerSize, activeTimestampUtcMs, appliedZoomState);
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    const { plotType, numSubplots, numGroups, numRealizations } = dataConfig;
    const { scrollMode } = layoutConfig;

    viewContext.setInstanceTitle(
        `${PLOT_TYPE_LABELS[plotType]} (Plots: ${numSubplots} Groups: ${numGroups} Reals: ${numRealizations})`,
    );

    const formatSeriesLabel = React.useCallback(
        (info: HoveredSeriesInfo): string => {
            switch (info.kind) {
                case "member":
                    return `${chartModel.memberLabel ?? "Realization"} ${info.memberId}`;
                case "statistic":
                    return `${info.seriesName ?? "Series"} ${info.statisticLabel}`;
                case "reference-line":
                    return "History";
                case "point-annotation":
                    return "Observation";
            }
        },
        [chartModel.memberLabel],
    );

    const handleHoveredSeriesChange = React.useCallback(
        (info: HoveredSeriesInfo | null) => {
            if (!info) {
                hoveredSeriesStore.setValue(null);
                return;
            }

            if (info.kind === "member") {
                hoveredSeriesStore.setValue({
                    group: info.groupKey,
                    label: formatSeriesLabel(info),
                });
                return;
            }

            if (info.kind === "statistic") {
                hoveredSeriesStore.setValue({
                    group: info.groupKey,
                    label: formatSeriesLabel(info),
                });
                return;
            }

            if (info.kind === "reference-line") {
                hoveredSeriesStore.setValue({
                    group: info.groupKey,
                    label: formatSeriesLabel(info),
                });
                return;
            }

            hoveredSeriesStore.setValue({
                group: info.groupKey,
                label: formatSeriesLabel(info),
            });
        },
        [formatSeriesLabel, hoveredSeriesStore],
    );
    const hasInteractionEntries = chartModel.interactionSeries.seriesByAxisIndex.size > 0;

    const seriesEvents = useSeriesInteraction(chartRef, hasInteractionEntries, chartModel.echartsOptions, {
        formatSeriesLabel,
        onHoveredSeriesChange: handleHoveredSeriesChange,
        interactionSeries: chartModel.interactionSeries,
    });
    const onChartEvents = React.useMemo(() => {
        return {
            ...seriesEvents,
            datazoom: handleDataZoom,
        };
    }, [seriesEvents, handleDataZoom]);
    useClickToTimestamp(
        chartRef,
        chartModel.timestamps,
        activeTimestampUtcMs,
        setActiveTimestampUtcMs,
        chartModel.echartsOptions,
    );
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto relative">
            <div className="absolute top-2 left-2 z-10 flex gap-4 p-2 bg-white/80 backdrop-blur border rounded shadow-sm text-xs">
                {plotType === PlotType.Timeseries && (
                    <div>
                        <span className="font-bold">Timestamp: </span>
                        {activeTimestampUtcMs
                            ? timestampUtcMsToCompactIsoString(activeTimestampUtcMs)
                            : "Ctrl + Click  to select"}
                    </div>
                )}
                {(plotType === PlotType.Timeseries || plotType === PlotType.MemberScatter) && (
                    <HoveredSeriesReadout store={hoveredSeriesStore} />
                )}
                <div>
                    <span className="font-bold">Zoom X: </span>
                    {Math.round(viewState.x?.start ?? 0)}% - {Math.round(viewState.x?.end ?? 100)}%
                </div>
                <div>
                    <span className="font-bold">Zoom Y: </span>
                    {Math.round(viewState.y?.start ?? 0)}% - {Math.round(viewState.y?.end ?? 100)}%
                </div>
            </div>

            <div
                style={{
                    height: chartHeight,
                    width: "100%",
                    minHeight: ROW_HEIGHT_PX,
                    minWidth: 100,
                }}
            >
                <ReactECharts
                    ref={chartRef}
                    option={chartModel.echartsOptions}
                    style={{ height: "100%", width: "100%" }}
                    onEvents={onChartEvents}
                    notMerge
                    lazyUpdate={true}
                />
            </div>
        </div>
    );
}
