
import type { EChartsOption } from "echarts";

import type {

    ContainerSize,
    DistributionTrace,

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
    buildMemberScatterChart,
    buildPercentileRangeChart,
    buildTimeseriesChart,
} from "@modules/_shared/eCharts";
import type { HistogramChartOptions } from "@modules/_shared/eCharts/charts/histogram";

import { PlotType } from "../typesAndEnums";
import {
    generateBarTraces,
    generateDistributionTraces,
    generateHeatmapTraces,
    generateMemberScatterTraces,
    generateTimeseriesGroups,
    generateTimeseriesOverlays,
} from "../utils/syntheticData";


type DemoPlotModel = {
    echartsOptions: EChartsOption;
    timestamps: number[];
    enableLinkedHover: boolean;
    enableClosestMemberTooltip: boolean;
    memberLabel?: string;
};

type OrchestratorConfig = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numRealizations: number;
    timeseriesDisplayConfig: TimeseriesDisplayConfig;
    memberLabel: string;
    histogramBins: HistogramChartOptions["numBins"];
    histogramType: HistogramChartOptions["histogramType"];
    showRealizationPoints: boolean;
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    activeTimestampUtcMs: number | null;
    containerSize?: ContainerSize;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export class DemoChartOrchestrator {
    public build(config: OrchestratorConfig): DemoPlotModel {
        switch (config.plotType) {
            case PlotType.Timeseries:
                return this.buildTimeseries(config);
            case PlotType.Histogram:
                return this.buildHistogram(config);
            case PlotType.PercentileRange:
                return this.buildPercentileRange(config);
            case PlotType.Density:
                return this.buildDensity(config);
            case PlotType.Exceedance:
                return this.buildExceedance(config);
            case PlotType.Convergence:
                return this.buildConvergence(config);
            case PlotType.Bar:
                return this.buildBar(config);
            case PlotType.Heatmap:
                return this.buildHeatmap(config);
            case PlotType.MemberScatter:
                return this.buildMemberScatter(config);
            default:
                return this.createStaticPlotModel({});
        }
    }

    private buildTimeseries(config: OrchestratorConfig): DemoPlotModel {
        const groups = generateTimeseriesGroups(config.numSubplots, config.numGroups, config.numRealizations);
        const overlays = generateTimeseriesOverlays(groups, config.numSubplots);
        const timestamps = groups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0)?.timestamps ?? [];

        const echartsOptions = buildTimeseriesChart(
            groups,
            {
                subplotOverlays: overlays,
                displayConfig: config.timeseriesDisplayConfig,
                yAxisLabel: "Value",
                memberLabel: config.memberLabel,
                activeTimestampUtcMs: config.activeTimestampUtcMs,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );

        return {
            echartsOptions,
            timestamps,
            enableLinkedHover: config.timeseriesDisplayConfig.showRealizations,
            enableClosestMemberTooltip:
                config.timeseriesDisplayConfig.showRealizations && !config.timeseriesDisplayConfig.showStatistics,
            memberLabel: config.memberLabel,
        };
    }

    private buildHistogram(config: OrchestratorConfig): DemoPlotModel {
        const groups = this.createDistributionGroups(config);
        const options = buildHistogramChart(
            groups,
            {
                numBins: config.histogramBins,
                histogramType: config.histogramType,
                showRealizationPoints: config.showRealizationPoints,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildPercentileRange(config: OrchestratorConfig): DemoPlotModel {
        const groups = this.createDistributionGroups(config);
        const options = buildPercentileRangeChart(
            groups,
            {
                showRealizationPoints: config.showRealizationPoints,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildDensity(config: OrchestratorConfig): DemoPlotModel {
        const groups = this.createDistributionGroups(config);
        const options = buildDensityChart(
            groups,
            {
                showRealizationPoints: config.showRealizationPoints,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildExceedance(config: OrchestratorConfig): DemoPlotModel {
        const groups = this.createDistributionGroups(config);
        const options = buildExceedanceChart(
            groups,
            { sharedXAxis: config.sharedXAxis, sharedYAxis: config.sharedYAxis },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildConvergence(config: OrchestratorConfig): DemoPlotModel {
        const groups = this.createDistributionGroups(config);
        const options = buildConvergenceChart(
            groups,
            { sharedXAxis: config.sharedXAxis, sharedYAxis: config.sharedYAxis },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildBar(config: OrchestratorConfig): DemoPlotModel {
        const groups = Array.from({ length: config.numSubplots }, (_, index) => ({
            title: `Subplot ${index + 1}`,
            traces: generateBarTraces(config.numGroups, index),
        }));

        const options = buildBarChart(
            groups,
            {
                showStatisticalMarkers: config.showStatisticalMarkers,
                showLabels: config.showBarLabels,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildHeatmap(config: OrchestratorConfig): DemoPlotModel {
        const traces = generateHeatmapTraces(config.numSubplots);
        const options = buildHeatmapChart(
            traces,
            { valueLabel: "Value" },
            config.containerSize,
        );
        return this.createStaticPlotModel(options);
    }

    private buildMemberScatter(config: OrchestratorConfig): DemoPlotModel {
        const groups = Array.from({ length: config.numSubplots }, (_, index) => ({
            title: `Subplot ${index + 1}`,
            traces: generateMemberScatterTraces(config.numGroups, config.numRealizations, index),
        }));

        const echartsOptions = buildMemberScatterChart(
            groups,
            {
                memberLabel: config.memberLabel,
                sharedXAxis: config.sharedXAxis,
                sharedYAxis: config.sharedYAxis,
            },
            config.containerSize,
        );

        return {
            echartsOptions,
            timestamps: [],
            enableLinkedHover: true,
            enableClosestMemberTooltip: false,
            memberLabel: config.memberLabel,
        };
    }


    private createDistributionGroups(config: OrchestratorConfig): SubplotGroup<DistributionTrace>[] {
        return Array.from({ length: config.numSubplots }, (_, index) => ({
            title: `Subplot ${index + 1}`,
            traces: generateDistributionTraces(config.numGroups, config.numRealizations, index),
        }));
    }

    private createStaticPlotModel(echartsOptions: EChartsOption): DemoPlotModel {
        return {
            echartsOptions,
            timestamps: [],
            enableLinkedHover: false,
            enableClosestMemberTooltip: false,
        };
    }
}