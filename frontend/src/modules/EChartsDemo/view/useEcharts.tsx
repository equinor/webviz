import React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import type { ChartZoomState } from "@modules/_shared/eCharts/core/composeChartOption";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import type { DemoPlotModel } from "./plotOrchestrator";
import { buildDistributionDemo, buildMiscDemo, buildTimeseriesDemo } from "./plotOrchestrator";

const TIMESERIES_MEMBER_LABEL = "Realization";

const DISTRIBUTION_PLOT_TYPES = new Set([
    PlotType.Histogram,
    PlotType.PercentileRange,
    PlotType.Density,
    PlotType.Exceedance,
    PlotType.Convergence,
]);

export function useDemoPlotModel(
    viewContext: ViewContext<Interfaces>,
    containerSize: { width: number; height: number },
    activeTimestampUtcMs: number | null,
    zoomState: ChartZoomState,
): DemoPlotModel {
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const tsConfig = viewContext.useSettingsToViewInterfaceValue("timeseriesDisplayConfig");
    const histConfig = viewContext.useSettingsToViewInterfaceValue("histogramDisplayConfig");
    const plConfig = viewContext.useSettingsToViewInterfaceValue("pointsAndLabelsConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    return React.useMemo(() => {
        const resolvedSize = containerSize.width > 0 && containerSize.height > 0 ? containerSize : undefined;
        const common = { data: dataConfig, layout: layoutConfig, containerSize: resolvedSize, currentZoom: zoomState };

        if (dataConfig.plotType === PlotType.Timeseries) {
            return buildTimeseriesDemo({
                ...common,
                displayConfig: {
                    showRealizations: tsConfig.showRealizations,
                    showStatistics: tsConfig.showStatistics,
                    showFanchart: tsConfig.showFanchart && tsConfig.showStatistics,
                    showHistorical: tsConfig.showHistory,
                    showObservations: tsConfig.showObservations,
                    selectedStatistics: tsConfig.selectedStatistics,
                },
                memberLabel: TIMESERIES_MEMBER_LABEL,
                activeTimestampUtcMs,
            });
        }

        if (DISTRIBUTION_PLOT_TYPES.has(dataConfig.plotType)) {
            return buildDistributionDemo({
                ...common,
                plotType: dataConfig.plotType,
                histogram: histConfig,
                pointsAndLabels: plConfig,
            });
        }

        return buildMiscDemo({
            ...common,
            plotType: dataConfig.plotType,
            pointsAndLabels: plConfig,
            memberLabel: TIMESERIES_MEMBER_LABEL,
        });
    }, [dataConfig, tsConfig, histConfig, plConfig, layoutConfig, activeTimestampUtcMs, containerSize, zoomState]);
}
