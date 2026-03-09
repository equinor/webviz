import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";

import type { Interfaces } from "../interfaces";
import { VisualizationMode } from "../typesAndEnums";

import { activeTimestampUtcMsAtom } from "./atoms/baseAtoms";
import { allQueriesFailedAtom, isDataFetchingAtom } from "./atoms/derivedAtoms";
import { useEchartsOptions } from "./hooks/useEchartsOptions";
import { useHeatmapDatasets } from "./hooks/useHeatmapDatasets";
import { useInstanceTitle } from "./hooks/useInstanceTitle";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { useSubplotGroups } from "./hooks/useSubplotGroups";
import { useSyncDateTimestamp } from "./hooks/useSyncDateTimestamp";

// ────────── View ──────────

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;
    const statusWriter = useViewStatusWriter(viewContext);

    // Fetching state atoms
    const isFetching = useAtomValue(isDataFetchingAtom);
    const allFailed = useAtomValue(allQueriesFailedAtom);

    // Settings values read directly from the interface
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");
    const selectedVectorBaseName = viewContext.useSettingsToViewInterfaceValue("selectedVectorBaseName");
    const ensembleIdents = viewContext.useSettingsToViewInterfaceValue("ensembleIdents");
    const vectorNamesToFetch = viewContext.useSettingsToViewInterfaceValue("vectorNamesToFetch");
    const showRecoveryFactor = viewContext.useSettingsToViewInterfaceValue("showRecoveryFactor");

    // ── Track container size for responsive decluttering ──
    const chartContainerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(chartContainerRef);

    const subplotGroups = useSubplotGroups(selectedVectorBaseName, showRecoveryFactor);

    const isHeatmap = visualizationMode === VisualizationMode.DrainageHeatmap;
    const heatmapDatasets = useHeatmapDatasets(isHeatmap, selectedVectorBaseName, showRecoveryFactor);

    // Flatten traces across all subplot groups for empty-state checks
    const allTraces = React.useMemo(() => subplotGroups.flatMap((g) => g.traces), [subplotGroups]);

    statusWriter.setLoading(isFetching);

    // ── Derived rendering data ──

    const yAxisLabel = showRecoveryFactor ? "Recovery Factor" : (selectedVectorBaseName ?? "Value");
    const queryEnabled = ensembleIdents.length > 0 && vectorNamesToFetch.length > 0;

    useInstanceTitle(viewContext);

    const { chartRef, echartsOptions, timeseriesChartData, availableTimestamps, onChartEvents } = useEchartsOptions(
        subplotGroups,
        heatmapDatasets,
        visualizationMode,
        selectedStatistics,
        yAxisLabel,
        containerSize.width > 0 && containerSize.height > 0 ? containerSize : undefined,
    );

    // ── Sync active timestamp with other modules via SyncSettingKey.DATE ──
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);
    useSyncDateTimestamp(
        viewContext,
        props.workbenchServices,
        activeTimestampUtcMs,
        setActiveTimestampUtcMs,
        availableTimestamps,
    );

    usePublishToDataChannels(viewContext, subplotGroups, yAxisLabel);

    const hasData = isHeatmap ? heatmapDatasets.length > 0 : timeseriesChartData.length > 0;
    const isPending = queryEnabled && isFetching && allTraces.length === 0 && heatmapDatasets.length === 0;
    const errorMessage = allFailed ? "Error loading data from all ensembles" : undefined;
    const infoMessage = !queryEnabled
        ? "Select ensembles, a vector, and regions to begin"
        : !hasData
          ? "No data available"
          : undefined;
    const showChart = queryEnabled && hasData && !allFailed;

    return (
        <div className="flex flex-col w-full h-full p-2 gap-2 overflow-hidden">
            <PendingWrapper
                isPending={isPending}
                errorMessage={errorMessage}
                infoMessage={infoMessage}
                className="flex-1 min-h-0"
            >
                <div ref={chartContainerRef} className="w-full h-full">
                    {showChart && (
                        <ReactECharts
                            ref={chartRef}
                            option={echartsOptions}
                            style={{ height: "100%", width: "100%" }}
                            onEvents={onChartEvents}
                            notMerge={true}
                        />
                    )}
                </div>
            </PendingWrapper>
        </div>
    );
}
