import React from "react";

import type { EChartsOption } from "echarts";

import type { ViewContext } from "@framework/ModuleContext";

import type { Interfaces } from "../interfaces";

import { DemoChartOrchestrator } from "./plotOrchestrator";
import type { ViewState } from "@modules/_shared/eCharts/hooks/useEchartsViewState";

const TIMESERIES_MEMBER_LABEL = "Realization";

type DemoPlotModel = {
    echartsOptions: EChartsOption;
    timestamps: number[];
    enableLinkedHover: boolean;
    enableClosestMemberTooltip: boolean;
    memberLabel?: string;
};

export function useDemoPlotModel(
    viewContext: ViewContext<Interfaces>,
    containerSize: { width: number; height: number },
    activeTimestampUtcMs: number | null,
    viewState: ViewState,
): DemoPlotModel {
    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const numSubplots = viewContext.useSettingsToViewInterfaceValue("numSubplots");
    const numGroups = viewContext.useSettingsToViewInterfaceValue("numGroups");
    const numRealizations = viewContext.useSettingsToViewInterfaceValue("numRealizations");
    const showRealizations = viewContext.useSettingsToViewInterfaceValue("showRealizations");
    const showStatistics = viewContext.useSettingsToViewInterfaceValue("showStatistics");
    const showFanchart = viewContext.useSettingsToViewInterfaceValue("showFanchart");
    const showHistory = viewContext.useSettingsToViewInterfaceValue("showHistory");
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");
    const showStatisticalMarkers = viewContext.useSettingsToViewInterfaceValue("showStatisticalMarkers");
    const showBarLabels = viewContext.useSettingsToViewInterfaceValue("showBarLabels");
    const showRealizationPoints = viewContext.useSettingsToViewInterfaceValue("showRealizationPoints");
    const histogramBins = viewContext.useSettingsToViewInterfaceValue("histogramBins");
    const histogramType = viewContext.useSettingsToViewInterfaceValue("histogramType");
    const sharedXAxis = viewContext.useSettingsToViewInterfaceValue("sharedXAxis");
    const sharedYAxis = viewContext.useSettingsToViewInterfaceValue("sharedYAxis");

    const orchestrator = React.useMemo(() => new DemoChartOrchestrator(), []);

    return React.useMemo(() => {
        const resolvedSize = containerSize.width > 0 && containerSize.height > 0 ? containerSize : undefined;

        return orchestrator.build({
            plotType,
            numSubplots,
            numGroups,
            numRealizations,
            timeseriesDisplayConfig: {
                showRealizations,
                showStatistics,
                showFanchart: showFanchart && showStatistics,
                showHistorical: showHistory,
                showObservations,
                selectedStatistics: selectedStatistics,
            },
            memberLabel: TIMESERIES_MEMBER_LABEL,
            histogramBins,
            histogramType,
            showRealizationPoints,
            showStatisticalMarkers,
            showBarLabels,
            activeTimestampUtcMs,
            containerSize: resolvedSize,
            sharedXAxis,
            sharedYAxis,
            currentZoom: viewState,
        });
    }, [
        orchestrator,
        plotType,
        numSubplots,
        numGroups,
        numRealizations,
        showRealizations,
        showStatistics,
        showFanchart,
        showHistory,
        showObservations,
        selectedStatistics,
        histogramBins,
        histogramType,
        showRealizationPoints,
        showStatisticalMarkers,
        showBarLabels,
        activeTimestampUtcMs,
        containerSize,
        sharedXAxis,
        sharedYAxis,
        viewState,
    ]);
}
