import React from "react";

import ReactECharts from "echarts-for-react";

import type { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import {
    computeSubplotGridLayout,
    HoveredMemberInfo,
    useClickToTimestamp,
    useClosestMemberTooltip,
    useHighlightOnHover,
} from "@modules/_shared/eCharts";

import type { Interfaces } from "../interfaces";
import { PLOT_TYPE_LABELS } from "../typesAndEnums";

import { useDemoPlotModel } from "./useEcharts";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

const ROW_HEIGHT_PX = 350;

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(containerRef);
    const chartRef = React.useRef<ReactECharts>(null);
    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);
    const [hoveredReal, setHoveredReal] = React.useState<{
        realization: number | null;
        ensemble: string | null;
    } | null>(null);

    const chartModel = useDemoPlotModel(viewContext, containerSize, activeTimestampUtcMs);

    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const numSubplots = viewContext.useSettingsToViewInterfaceValue("numSubplots");
    const numGroups = viewContext.useSettingsToViewInterfaceValue("numGroups");
    const numRealizations = viewContext.useSettingsToViewInterfaceValue("numRealizations");
    const scrollMode = viewContext.useSettingsToViewInterfaceValue("scrollMode");

    React.useEffect(() => {
        viewContext.setInstanceTitle(
            `${PLOT_TYPE_LABELS[plotType]} (Plots: ${numSubplots} Groups: ${numGroups} Reals: ${numRealizations})`,
        );
    }, [plotType, numSubplots, numGroups, numRealizations, viewContext]);

    const handleHoveredRealChange = React.useCallback((info: HoveredMemberInfo | null) => {
        setHoveredReal({ realization: info?.memberId ?? null, ensemble: info?.groupKey ?? null });
    }, []);

    const onChartEvents = useHighlightOnHover(chartRef, chartModel.enableLinkedHover, {
        onHoveredMemberChange: handleHoveredRealChange,
    });

    useClickToTimestamp(
        chartRef,
        chartModel.timestamps,
        activeTimestampUtcMs,
        setActiveTimestampUtcMs,
        chartModel.echartsOptions,
    );

    useClosestMemberTooltip(
        chartRef,
        chartModel.enableClosestMemberTooltip,
        chartModel.timestamps,
        chartModel.echartsOptions,
        { memberLabel: chartModel.memberLabel },
    );
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto relative">
            <div className="absolute top-2 left-2 z-10 flex gap-4 p-2 bg-white/80 backdrop-blur border rounded shadow-sm text-xs">
                <div>
                    <span className="font-bold">Timestamp: </span>
                    {activeTimestampUtcMs
                        ? timestampUtcMsToCompactIsoString(activeTimestampUtcMs)
                        : "Click chart (timeseries) to select"}
                </div>
                <div>
                    <span className="font-bold">Hovered Real: </span>
                    {hoveredReal?.realization ?? "None"}
                    {hoveredReal?.ensemble && ` (Group: ${hoveredReal.ensemble})`}
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
                />
            </div>
        </div>
    );
}
