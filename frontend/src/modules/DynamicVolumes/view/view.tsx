import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import type { Interfaces } from "../interfaces";

import { visualizationModeAtom } from "./atoms/baseAtoms";
import { allQueriesFailedAtom, isDataFetchingAtom, subplotGroupsAtom } from "./atoms/derivedAtoms";
import { useEchartsOptions } from "./hooks/useEchartsOptions";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";

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

    // Status writer
    statusWriter.setLoading(isFetching);

    // ── Derived rendering data ──

    const yAxisLabel = showRecoveryFactor ? "Recovery Factor" : (selectedVectorBaseName ?? "Value");
    const queryEnabled = ensembleIdents.length > 0 && vectorNamesToFetch.length > 0;

    // ── ECharts options & event handlers (extracted hook) ──

    const { chartRef, echartsOptions, timeseriesChartData, onChartEvents } = useEchartsOptions(
        subplotGroups,
        visualizationMode,
        selectedStatistics,
        yAxisLabel,
    );

    // ── Publish data channels ──

    usePublishToDataChannels(viewContext, subplotGroups, yAxisLabel);

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
