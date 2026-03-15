import React from "react";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import type { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import type {
    BarTrace,
    ContainerSize,
    DistributionTrace,
    RealizationScatterTrace,
    SubplotGroup,
    TimeseriesDisplayConfig,
} from "@modules/_shared/eCharts";
import {
    buildBarChart,
    buildConvergenceChart,
    buildDensityChart,
    buildExceedanceChart,
    buildHeatmapChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    buildRealizationScatterChart,
    buildTimeseriesChart,
    computeSubplotGridLayout,
    useTimeseriesInteractions,
} from "@modules/_shared/eCharts";

import type { Interfaces } from "./interfaces";
import { PLOT_TYPE_LABELS, PlotType } from "./typesAndEnums";
import {
    generateBarTraces,
    generateDistributionTraces,
    generateHeatmapTraces,
    generateRealizationScatterTraces,
    generateTimeseriesGroups,
    generateTimeseriesOverlays,
} from "./utils/syntheticData";

const ROW_HEIGHT_PX = 350;

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;

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
    const scrollMode = viewContext.useSettingsToViewInterfaceValue("scrollMode");

    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(containerRef);

    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);

    React.useEffect(() => {
        viewContext.setInstanceTitle(
            `${PLOT_TYPE_LABELS[plotType]} (Plots: ${numSubplots} Groups: ${numGroups} Reals: ${numRealizations})`,
        );
    }, [plotType, numSubplots, numGroups, numRealizations, viewContext]);

    const echartsOptions = React.useMemo(() => {
        const size: ContainerSize | undefined =
            containerSize.width > 0 && containerSize.height > 0 ? containerSize : undefined;

        switch (plotType) {
            case PlotType.Timeseries:
                return buildTimeseries(
                    numSubplots,
                    numGroups,
                    numRealizations,
                    showRealizations,
                    showStatistics,
                    showFanchart,
                    showHistory,
                    showObservations,
                    selectedStatistics,
                    activeTimestampUtcMs,
                    size,
                    sharedXAxis,
                    sharedYAxis,
                );
            case PlotType.Histogram:
                return buildHistogramChart(
                    createDistributionSubplotGroups(numSubplots, numGroups, numRealizations),
                    {
                        numBins: histogramBins,
                        histogramType,
                        showRealizationPoints,
                        sharedXAxis,
                        sharedYAxis,
                    },
                    containerSize,
                );
            case PlotType.PercentileRange:
                return buildPercentileRangeChart(
                    createDistributionSubplotGroups(numSubplots, numGroups, numRealizations),
                    { showRealizationPoints, sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.Density:
                return buildDensityChart(
                    createDistributionSubplotGroups(numSubplots, numGroups, numRealizations),
                    { showRealizationPoints, sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.Exceedance:
                return buildExceedanceChart(
                    createDistributionSubplotGroups(numSubplots, numGroups, numRealizations),
                    { sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.Convergence:
                return buildConvergenceChart(
                    createDistributionSubplotGroups(numSubplots, numGroups, numRealizations),
                    { sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.Bar:
                return buildBarChart(
                    createBarSubplotGroups(numSubplots, numGroups),
                    { showStatisticalMarkers, showLabels: showBarLabels, sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.RealizationScatter:
                return buildRealizationScatterChart(
                    createScatterSubplotGroups(numSubplots, numGroups, numRealizations),
                    { sharedXAxis, sharedYAxis },
                    size,
                );
            case PlotType.Heatmap:
                return buildHeatmapChart(generateHeatmapTraces(numSubplots), "Value");
            default:
                return {};
        }
    }, [
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
        showStatisticalMarkers,
        showBarLabels,
        showRealizationPoints,
        histogramBins,
        histogramType,
        sharedXAxis,
        sharedYAxis,
        activeTimestampUtcMs,
        containerSize,
    ]);
    const timestamps = React.useMemo(() => {
        if (plotType === PlotType.Timeseries) {
            return (
                generateTimeseriesGroups(numSubplots, numGroups, numRealizations)
                    .flatMap((group) => group.traces)
                    .find((trace) => trace.timestamps.length > 0)?.timestamps ?? []
            );
        }
        return [];
    }, [plotType, numSubplots, numGroups, numRealizations]);
    const hasRealizations =
        plotType === PlotType.RealizationScatter || (plotType === PlotType.Timeseries && showRealizations);
    const { chartRef, onChartEvents } = useTimeseriesInteractions({
        enableLinkedHover: hasRealizations,
        timestamps,
        activeTimestampUtcMs,
        setActiveTimestampUtcMs,
        layoutDependency: echartsOptions,
    });

    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto">
            {containerSize.width > 0 && containerSize.height > 0 && (
                <div style={{ height: chartHeight, width: "100%" }}>
                    <ReactECharts
                        ref={chartRef}
                        option={echartsOptions}
                        style={{ height: "100%", width: "100%" }}
                        onEvents={onChartEvents}
                        notMerge
                    />
                </div>
            )}
        </div>
    );
}

function buildTimeseries(
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
    showRealizations: boolean,
    showStatistics: boolean,
    showFanchart: boolean,
    showHistory: boolean,
    showObservations: boolean,
    selectedStatistics: string[],
    activeTimestampUtcMs: number | null,
    containerSize?: ContainerSize,
    sharedXAxis?: boolean,
    sharedYAxis?: boolean,
): EChartsOption {
    const groups = generateTimeseriesGroups(numSubplots, numGroups, numRealizations);
    const overlays = generateTimeseriesOverlays(groups, numSubplots);
    const config: TimeseriesDisplayConfig = {
        showRealizations,
        showStatistics,
        showFanchart: showFanchart && showStatistics,
        showHistorical: showHistory,
        showObservations,
        selectedStatistics: selectedStatistics as TimeseriesDisplayConfig["selectedStatistics"],
    };
    return buildTimeseriesChart(groups, overlays, config, "Value", activeTimestampUtcMs, containerSize, {
        sharedXAxis,
        sharedYAxis,
    });
}

function createDistributionSubplotGroups(
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
): SubplotGroup<DistributionTrace>[] {
    return Array.from({ length: numSubplots }, (_, index) => ({
        title: `Subplot ${index + 1}`,
        traces: generateDistributionTraces(numGroups, numRealizations, index),
    }));
}

function createBarSubplotGroups(numSubplots: number, numGroups: number): SubplotGroup<BarTrace>[] {
    return Array.from({ length: numSubplots }, (_, index) => ({
        title: `Subplot ${index + 1}`,
        traces: generateBarTraces(numGroups, index),
    }));
}

function createScatterSubplotGroups(
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
): SubplotGroup<RealizationScatterTrace>[] {
    return Array.from({ length: numSubplots }, (_, index) => ({
        title: `Subplot ${index + 1}`,
        traces: generateRealizationScatterTraces(numGroups, numRealizations, index),
    }));
}
