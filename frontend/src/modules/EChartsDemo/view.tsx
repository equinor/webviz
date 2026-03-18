import React from "react";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import type { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import type {
    BarTrace,
    ContainerSize,
    DistributionTrace,
    HoveredMemberInfo,
    MemberScatterTrace,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesTrace,
} from "@modules/_shared/eCharts";
import {
    buildBarChart,
    buildMemberScatterChart,
    buildConvergenceChart,
    buildDensityChart,
    buildExceedanceChart,
    buildHeatmapChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    buildTimeseriesChart,
    computeSubplotGridLayout,
    useClickToTimestamp,
    useClosestMemberTooltip,
    useHighlightOnHover,
} from "@modules/_shared/eCharts";

import type { Interfaces } from "./interfaces";
import { PLOT_TYPE_LABELS, PlotType } from "./typesAndEnums";
import {
    generateBarTraces,
    generateDistributionTraces,
    generateHeatmapTraces,
    generateMemberScatterTraces,
    generateTimeseriesGroups,
    generateTimeseriesOverlays,
} from "./utils/syntheticData";

const ROW_HEIGHT_PX = 350;
const TIMESERIES_MEMBER_LABEL = "Realization";

type DemoPlotModel = {
    echartsOptions: EChartsOption;
    timestamps: number[];
    enableLinkedHover: boolean;
    enableClosestMemberTooltip: boolean;
    memberLabel?: string;
};

type DemoPlotBuildContext = {
    numSubplots: number;
    numGroups: number;
    numRealizations: number;
    timeseriesDisplayConfig: TimeseriesDisplayConfig;
    memberLabel: string;
    histogramBins: NonNullable<Parameters<typeof buildHistogramChart>[1]>["numBins"];
    histogramType: NonNullable<Parameters<typeof buildHistogramChart>[1]>["histogramType"];
    showRealizationPoints: boolean;
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    activeTimestampUtcMs: number | null;
    containerSize?: ContainerSize;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

type DemoPlotBuilder = (context: DemoPlotBuildContext) => DemoPlotModel;

const DEMO_PLOT_BUILDERS: Record<PlotType, DemoPlotBuilder> = {
    [PlotType.Timeseries]: buildTimeseriesDemoPlot,
    [PlotType.Histogram]: buildHistogramDemoPlot,
    [PlotType.PercentileRange]: buildPercentileRangeDemoPlot,
    [PlotType.Density]: buildDensityDemoPlot,
    [PlotType.Exceedance]: buildExceedanceDemoPlot,
    [PlotType.Convergence]: buildConvergenceDemoPlot,
    [PlotType.Bar]: buildBarDemoPlot,
    [PlotType.Heatmap]: buildHeatmapDemoPlot,
    [PlotType.MemberScatter]: buildMemberScatterDemoPlot,
};

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
    const chartRef = React.useRef<ReactECharts>(null);

    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);

    const timeseriesDisplayConfig = React.useMemo<TimeseriesDisplayConfig>(
        () => ({
            showRealizations,
            showStatistics,
            showFanchart: showFanchart && showStatistics,
            showHistorical: showHistory,
            showObservations,
            selectedStatistics: selectedStatistics as TimeseriesDisplayConfig["selectedStatistics"],
        }),
        [showRealizations, showStatistics, showFanchart, showHistory, showObservations, selectedStatistics],
    );

    React.useEffect(() => {
        viewContext.setInstanceTitle(
            `${PLOT_TYPE_LABELS[plotType]} (Plots: ${numSubplots} Groups: ${numGroups} Reals: ${numRealizations})`,
        );
    }, [plotType, numSubplots, numGroups, numRealizations, viewContext]);

    const chartModel = React.useMemo(() => {
        return buildDemoPlotModel(plotType, {
            numSubplots,
            numGroups,
            numRealizations,
            timeseriesDisplayConfig,
            memberLabel: TIMESERIES_MEMBER_LABEL,
            histogramBins,
            histogramType,
            showRealizationPoints,
            showStatisticalMarkers,
            showBarLabels,
            activeTimestampUtcMs,
            containerSize: resolveContainerSize(containerSize),
            sharedXAxis,
            sharedYAxis,
        });
    }, [
        plotType,
        numSubplots,
        numGroups,
        numRealizations,
        timeseriesDisplayConfig,
        histogramBins,
        histogramType,
        showRealizationPoints,
        showStatisticalMarkers,
        showBarLabels,
        activeTimestampUtcMs,
        containerSize,
        sharedXAxis,
        sharedYAxis,
    ]);

    const handleHoveredMemberChange = React.useCallback((info: HoveredMemberInfo | null) => {
        console.log({ realizaton: info?.memberId, ensemble: info?.groupKey });
        return info;
    }, []);

    const onChartEvents = useHighlightOnHover(chartRef, chartModel.enableLinkedHover, {
        onHoveredMemberChange: handleHoveredMemberChange,
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
        <div ref={containerRef} className="w-full h-full overflow-auto">
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

function buildDemoPlotModel(plotType: PlotType, context: DemoPlotBuildContext): DemoPlotModel {
    return DEMO_PLOT_BUILDERS[plotType](context);
}

function buildTimeseriesDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    const {
        numSubplots,
        numGroups,
        numRealizations,
        timeseriesDisplayConfig,
        memberLabel,
        activeTimestampUtcMs,
        containerSize,
        sharedXAxis,
        sharedYAxis,
    } = context;
    const groups = generateTimeseriesGroups(numSubplots, numGroups, numRealizations);
    const overlays = generateTimeseriesOverlays(groups, numSubplots);

    return {
        echartsOptions: buildTimeseriesChart(
            groups,
            {
                subplotOverlays: overlays,
                displayConfig: timeseriesDisplayConfig,
                yAxisLabel: "Value",
                memberLabel,
                activeTimestampUtcMs,
                sharedXAxis,
                sharedYAxis,
            },
            containerSize,
        ),
        timestamps: extractTimeseriesTimestamps(groups),
        enableLinkedHover: timeseriesDisplayConfig.showRealizations,
        enableClosestMemberTooltip: timeseriesDisplayConfig.showRealizations && !timeseriesDisplayConfig.showStatistics,
        memberLabel,
    };
}

function buildHistogramDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildHistogramChart(
            createDistributionSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                numBins: context.histogramBins,
                histogramType: context.histogramType,
                showRealizationPoints: context.showRealizationPoints,
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildPercentileRangeDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildPercentileRangeChart(
            createDistributionSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                showRealizationPoints: context.showRealizationPoints,
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildDensityDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildDensityChart(
            createDistributionSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                showRealizationPoints: context.showRealizationPoints,
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildExceedanceDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildExceedanceChart(
            createDistributionSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildConvergenceDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildConvergenceChart(
            createDistributionSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildBarDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildBarChart(
            createBarSubplotGroups(context.numSubplots, context.numGroups),
            {
                showStatisticalMarkers: context.showStatisticalMarkers,
                showLabels: context.showBarLabels,
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
    );
}

function buildHeatmapDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return createStaticPlotModel(
        buildHeatmapChart(generateHeatmapTraces(context.numSubplots), { valueLabel: "Value" }),
    );
}

function buildMemberScatterDemoPlot(context: DemoPlotBuildContext): DemoPlotModel {
    return {
        echartsOptions: buildMemberScatterChart(
            createMemberScatterSubplotGroups(context.numSubplots, context.numGroups, context.numRealizations),
            {
                memberLabel: context.memberLabel,
                sharedXAxis: context.sharedXAxis,
                sharedYAxis: context.sharedYAxis,
            },
            context.containerSize,
        ),
        timestamps: [],
        enableLinkedHover: true,
        enableClosestMemberTooltip: false,
        memberLabel: context.memberLabel,
    };
}

function createStaticPlotModel(echartsOptions: EChartsOption): DemoPlotModel {
    return {
        echartsOptions,
        timestamps: [],
        enableLinkedHover: false,
        enableClosestMemberTooltip: false,
    };
}

function extractTimeseriesTimestamps(groups: SubplotGroup<TimeseriesTrace>[]): number[] {
    return groups.flatMap((group) => group.traces).find((trace) => trace.timestamps.length > 0)?.timestamps ?? [];
}

function resolveContainerSize(containerSize: ContainerSize): ContainerSize | undefined {
    return containerSize.width > 0 && containerSize.height > 0 ? containerSize : undefined;
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

function createMemberScatterSubplotGroups(
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
): SubplotGroup<MemberScatterTrace>[] {
    return Array.from({ length: numSubplots }, (_, index) => ({
        title: `Subplot ${index + 1}`,
        traces: generateMemberScatterTraces(numGroups, numRealizations, index),
    }));
}
