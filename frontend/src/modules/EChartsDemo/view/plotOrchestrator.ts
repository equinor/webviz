import type { EChartsOption } from "echarts";

import type {
    BaseChartOptions,
    ContainerSize,
    DistributionTrace,
    InteractionSeries,
    SubplotGroup,
    TimeseriesDisplayConfig as SharedTimeseriesDisplayConfig,
} from "@modules/_shared/eCharts";
import {
    buildBarChart,
    buildConvergenceChart,
    buildDensityChart,
    buildExceedanceChart,
    buildHeatmapChart,
    buildHistogramChart,
    buildMemberScatterChart,
    buildMemberScatterInteractionSeries,
    buildPercentileRangeChart,
    buildTimeseriesChart,
    buildTimeseriesInteractionSeries,
} from "@modules/_shared/eCharts";
import type { ChartZoomState } from "@modules/_shared/eCharts/core/composeChartOption";

import type {
    DataConfig,
    HistogramDisplayConfig,
    LayoutConfig,
    PointsAndLabelsConfig,
} from "../settings/atoms/baseAtoms";
import { PlotType } from "../typesAndEnums";
import {
    generateBarTraces,
    generateDistributionTraces,
    generateHeatmapTraces,
    generateMemberScatterTraces,
    generateTimeseriesGroups,
    generateTimeseriesOverlays,
} from "../utils/syntheticData";

export type DemoPlotModel = {
    echartsOptions: EChartsOption;
    interactionSeries: InteractionSeries;
    timestamps: number[];
    memberLabel?: string;
};

function makeEmptyInteractionSeries(): InteractionSeries {
    return {
        matchingSeriesIndicesByKey: new Map(),
        resolutionMode: "scatter",
        seriesByAxisIndex: new Map(),
    };
}

// ---------------------------------------------------------------------------
// Common helpers
// ---------------------------------------------------------------------------

type CommonConfig = {
    data: DataConfig;
    layout: LayoutConfig;
    containerSize?: ContainerSize;
    currentZoom?: ChartZoomState;
};

function getBaseOptions(config: CommonConfig): BaseChartOptions {
    return {
        containerSize: config.containerSize,
        sharedXAxis: config.layout.sharedXAxis,
        sharedYAxis: config.layout.sharedYAxis,
        zoomState: config.currentZoom,
    };
}

function createDistributionGroups(data: DataConfig): SubplotGroup<DistributionTrace>[] {
    return Array.from({ length: data.numSubplots }, (_, index) => ({
        title: `Subplot ${index + 1}`,
        traces: generateDistributionTraces(data.numGroups, data.numRealizations, index),
    }));
}

function staticPlotModel(echartsOptions: EChartsOption): DemoPlotModel {
    return {
        echartsOptions,
        interactionSeries: makeEmptyInteractionSeries(),
        timestamps: [],
    };
}

// ---------------------------------------------------------------------------
// Timeseries builder
// ---------------------------------------------------------------------------

type TimeseriesConfig = CommonConfig & {
    displayConfig: SharedTimeseriesDisplayConfig;
    memberLabel: string;
    activeTimestampUtcMs: number | null;
};

export function buildTimeseriesDemo(config: TimeseriesConfig): DemoPlotModel {
    const groups = generateTimeseriesGroups(
        config.data.numSubplots, config.data.numGroups, config.data.numRealizations,
    );
    const overlays = generateTimeseriesOverlays(groups, config.data.numSubplots);
    const timestamps = groups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0)?.timestamps ?? [];

    const echartsOptions = buildTimeseriesChart(groups, {
        base: getBaseOptions(config),
        series: {
            subplotOverlays: overlays,
            displayConfig: config.displayConfig,
            yAxisLabel: "Value",
            memberLabel: config.memberLabel,
            activeTimestampUtcMs: config.activeTimestampUtcMs,
        },
    });

    return {
        echartsOptions,
        interactionSeries: buildTimeseriesInteractionSeries(groups, {
            displayConfig: config.displayConfig,
            subplotOverlays: overlays,
        }),
        timestamps,
        memberLabel: config.memberLabel,
    };
}

// ---------------------------------------------------------------------------
// Distribution builder (histogram, percentileRange, density, exceedance, convergence)
// ---------------------------------------------------------------------------

type DistributionConfig = CommonConfig & {
    plotType: PlotType;
    histogram: HistogramDisplayConfig;
    pointsAndLabels: PointsAndLabelsConfig;
};

export function buildDistributionDemo(config: DistributionConfig): DemoPlotModel {
    const base = getBaseOptions(config);
    const groups = createDistributionGroups(config.data);

    switch (config.plotType) {
        case PlotType.Histogram:
            return staticPlotModel(buildHistogramChart(groups, {
                base,
                series: {
                    numBins: config.histogram.histogramBins,
                    histogramType: config.histogram.histogramType,
                    showRealizationPoints: config.pointsAndLabels.showRealizationPoints,
                },
            }));
        case PlotType.PercentileRange:
            return staticPlotModel(buildPercentileRangeChart(groups, {
                base,
                series: { showRealizationPoints: config.pointsAndLabels.showRealizationPoints },
            }));
        case PlotType.Density:
            return staticPlotModel(buildDensityChart(groups, {
                base,
                series: { showRealizationPoints: config.pointsAndLabels.showRealizationPoints },
            }));
        case PlotType.Exceedance:
            return staticPlotModel(buildExceedanceChart(groups, { base }));
        case PlotType.Convergence:
            return staticPlotModel(buildConvergenceChart(groups, { base }));
        default:
            return staticPlotModel({});
    }
}

// ---------------------------------------------------------------------------
// Misc builder (bar, heatmap, scatter)
// ---------------------------------------------------------------------------

type MiscConfig = CommonConfig & {
    plotType: PlotType;
    pointsAndLabels: PointsAndLabelsConfig;
    memberLabel: string;
};

export function buildMiscDemo(config: MiscConfig): DemoPlotModel {
    const base = getBaseOptions(config);

    switch (config.plotType) {
        case PlotType.Bar: {
            const groups = Array.from({ length: config.data.numSubplots }, (_, index) => ({
                title: `Subplot ${index + 1}`,
                traces: generateBarTraces(config.data.numGroups, index),
            }));
            return staticPlotModel(buildBarChart(groups, {
                base,
                series: {
                    showStatisticalMarkers: config.pointsAndLabels.showStatisticalMarkers,
                    showLabels: config.pointsAndLabels.showBarLabels,
                },
            }));
        }
        case PlotType.Heatmap: {
            const traces = generateHeatmapTraces(config.data.numSubplots);
            return staticPlotModel(buildHeatmapChart(traces, {
                base,
                series: { valueLabel: "Value" },
            }));
        }
        case PlotType.MemberScatter: {
            const groups = Array.from({ length: config.data.numSubplots }, (_, index) => ({
                title: `Subplot ${index + 1}`,
                traces: generateMemberScatterTraces(config.data.numGroups, config.data.numRealizations, index),
            }));
            return {
                echartsOptions: buildMemberScatterChart(groups, {
                    base,
                    series: { memberLabel: config.memberLabel },
                }),
                interactionSeries: buildMemberScatterInteractionSeries(groups),
                timestamps: [],
                memberLabel: config.memberLabel,
            };
        }
        default:
            return staticPlotModel({});
    }
}