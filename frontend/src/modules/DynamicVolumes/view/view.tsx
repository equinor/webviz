import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import type { Interfaces } from "../interfaces";
import { VisualizationMode } from "../typesAndEnums";
import { buildTimeseriesOptions } from "../utils/echartsTimeseriesOptions";

import { visualizationModeAtom } from "./atoms/baseAtoms";
import { allQueriesFailedAtom, isDataFetchingAtom, subplotGroupsAtom } from "./atoms/derivedAtoms";

// ────────── View ──────────

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;
    const statusWriter = useViewStatusWriter(viewContext);

    // View-side atoms
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const isFetching = useAtomValue(isDataFetchingAtom);
    const allFailed = useAtomValue(allQueriesFailedAtom);
    const subplotGroups = useAtomValue(subplotGroupsAtom);

    // Flatten traces across all subplot groups for empty-state checks
    const allTraces = React.useMemo(() => subplotGroups.flatMap((g) => g.traces), [subplotGroups]);

    // Settings interface values that are only needed for rendering
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");
    const selectedVectorBaseName = viewContext.useSettingsToViewInterfaceValue("selectedVectorBaseName");
    const ensembleIdents = viewContext.useSettingsToViewInterfaceValue("ensembleIdents");
    const vectorNamesToFetch = viewContext.useSettingsToViewInterfaceValue("vectorNamesToFetch");
    const showRecoveryFactor = viewContext.useSettingsToViewInterfaceValue("showRecoveryFactor");

    // Local view state
    const chartRef = React.useRef<ReactECharts>(null);

    // Status writer
    statusWriter.setLoading(isFetching);

    // ── Derived rendering data ──

    const showStatLines = visualizationMode !== VisualizationMode.IndividualRealizations;
    const showFanchart = visualizationMode === VisualizationMode.StatisticalFanchart;
    const yAxisLabel = showRecoveryFactor ? "Recovery Factor" : (selectedVectorBaseName ?? "Value");
    const queryEnabled = ensembleIdents.length > 0 && vectorNamesToFetch.length > 0;

    // ── Build echarts data from subplot groups ──

    const { echartsOptions, timeseriesChartData } = React.useMemo(() => {
        return buildTimeseriesOptions(subplotGroups, showStatLines, showFanchart, selectedStatistics, yAxisLabel);
    }, [subplotGroups, showStatLines, showFanchart, selectedStatistics, yAxisLabel]);

    // ── Handlers ──

    const highlightedSeriesRef = React.useRef<string | null>(null);

    const onChartEvents = React.useMemo(
        () => ({
            mouseover: (e: any) => {
                if (!showStatLines && e.seriesName && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    // Dim all, then brighten the hovered one
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

    // ── Loading / empty states ──

    if (!queryEnabled) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-400">
                Select ensembles, a vector, and regions to begin
            </div>
        );
    }

    if (isFetching && allTraces.length === 0) {
        return <div className="flex items-center justify-center w-full h-full text-gray-400">Loading data...</div>;
    }

    if (allFailed) {
        return (
            <div className="flex items-center justify-center w-full h-full text-red-500">
                Error loading data from all ensembles
            </div>
        );
    }

    if (!timeseriesChartData.length) {
        return <div className="flex items-center justify-center w-full h-full text-gray-400">No data available</div>;
    }

    return (
        <div className="flex flex-col w-full h-full p-2 gap-2 overflow-hidden">
            {/* Timeseries chart */}
            <div className="w-full flex-1 min-h-0">
                <ReactECharts
                    ref={chartRef}
                    option={echartsOptions}
                    style={{ height: "100%", width: "100%" }}
                    onEvents={onChartEvents}
                    notMerge={true}
                />
            </div>
        </div>
    );
}

// ────────── Constants ──────────
