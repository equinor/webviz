import React from "react";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import type { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { ContainerSize, SubplotAxisDef, TimeseriesDisplayConfig } from "@modules/_shared/eCharts";
import {
    buildBarSeries,
    buildBoxPlotSeries,
    buildConvergenceSeries,
    buildDistributionSeries,
    buildHeatmapChart,
    buildHistogramSeries,
    buildSubplotAxes,
    buildTimeseriesChart,
    composeChartOption,
    computeSubplotGridLayout,
    useHighlightOnHover,
} from "@modules/_shared/eCharts";

import type { Interfaces } from "./interfaces";
import { PlotType } from "./typesAndEnums";
import {
    generateBarTraces,
    generateDistributionTraces,
    generateHeatmapTraces,
    generateTimeseriesGroups,
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
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");
    const showStatisticalMarkers = viewContext.useSettingsToViewInterfaceValue("showStatisticalMarkers");
    const showRealizationPoints = viewContext.useSettingsToViewInterfaceValue("showRealizationPoints");
    const scrollMode = viewContext.useSettingsToViewInterfaceValue("scrollMode");

    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(containerRef);
    const chartRef = React.useRef<ReactECharts>(null);

    const hasRealizations = plotType === PlotType.Timeseries && showRealizations;
    const onChartEvents = useHighlightOnHover(chartRef, hasRealizations);

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
                    selectedStatistics,
                    size,
                );
            case PlotType.Histogram:
            case PlotType.BoxPlot:
            case PlotType.Distribution:
            case PlotType.Convergence:
                return buildDistributionChart(
                    plotType,
                    numSubplots,
                    numGroups,
                    numRealizations,
                    showStatisticalMarkers,
                    showRealizationPoints,
                    size,
                );
            case PlotType.Bar:
                return buildBarChart(numSubplots, numGroups, showStatisticalMarkers, size);
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
        selectedStatistics,
        showStatisticalMarkers,
        showRealizationPoints,
        containerSize,
    ]);

    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto">
            <div style={{ height: chartHeight, width: "100%" }}>
                <ReactECharts
                    ref={chartRef}
                    option={echartsOptions}
                    style={{ height: "100%", width: "100%" }}
                    onEvents={onChartEvents}
                    notMerge
                />
            </div>
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
    selectedStatistics: string[],
    containerSize?: ContainerSize,
): EChartsOption {
    const groups = generateTimeseriesGroups(numSubplots, numGroups, numRealizations);
    const config: TimeseriesDisplayConfig = {
        showRealizations,
        showStatistics,
        showFanchart,
        selectedStatistics: selectedStatistics as TimeseriesDisplayConfig["selectedStatistics"],
    };
    return buildTimeseriesChart(groups, config, "Value", null, containerSize).echartsOptions;
}

function buildDistributionChart(
    plotType: PlotType,
    numSubplots: number,
    numGroups: number,
    numRealizations: number,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
    containerSize?: ContainerSize,
): EChartsOption {
    const layout = computeSubplotGridLayout(numSubplots);
    const allSeries: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();
    const axisDefs: SubplotAxisDef[] = [];

    const yAxisLabel = plotType === PlotType.Histogram ? "Percentage (%)" : "Value";
    const xAxisLabel = plotType === PlotType.Convergence ? "Realizations" : "Value";

    for (let s = 0; s < numSubplots; s++) {
        const traces = generateDistributionTraces(numGroups, numRealizations);

        for (const trace of traces) {
            switch (plotType) {
                case PlotType.Histogram:
                    allSeries.push(
                        ...buildHistogramSeries(
                            trace,
                            { showStatisticalMarkers, showRealizationPoints, numBins: 20 },
                            s,
                        ),
                    );
                    break;
                case PlotType.BoxPlot:
                    allSeries.push(...buildBoxPlotSeries(trace, { showStatisticalMarkers, showRealizationPoints }, s));
                    break;
                case PlotType.Distribution:
                    allSeries.push(...buildDistributionSeries(trace, { showRealizationPoints }, s));
                    break;
                case PlotType.Convergence:
                    allSeries.push(...buildConvergenceSeries(trace, s));
                    break;
            }
            if (!seenLegend.has(trace.name)) {
                legendData.push(trace.name);
                seenLegend.add(trace.name);
            }
        }

        axisDefs.push({
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: `Subplot ${s + 1}`,
        });
    }

    const axes = buildSubplotAxes(layout, axisDefs);
    return composeChartOption(layout, axes, { series: allSeries, legendData, containerSize });
}

function buildBarChart(
    numSubplots: number,
    numGroups: number,
    showStatisticalMarkers: boolean,
    containerSize?: ContainerSize,
): EChartsOption {
    const layout = computeSubplotGridLayout(numSubplots);
    const allSeries: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();
    const axisDefs: SubplotAxisDef[] = [];
    let allCategories: (string | number)[] = [];

    for (let s = 0; s < numSubplots; s++) {
        const traces = generateBarTraces(numGroups);

        for (const trace of traces) {
            const series = buildBarSeries(trace, { showStatisticalMarkers });
            for (const ser of series) {
                ser.xAxisIndex = s;
                ser.yAxisIndex = s;
                allSeries.push(ser);
            }
            if (!seenLegend.has(trace.name)) {
                legendData.push(trace.name);
                seenLegend.add(trace.name);
            }
            if (allCategories.length === 0) allCategories = trace.categories;
        }

        axisDefs.push({
            xAxis: { type: "category", data: allCategories },
            yAxis: { type: "value" },
            title: `Subplot ${s + 1}`,
        });
    }

    const axes = buildSubplotAxes(layout, axisDefs);
    return composeChartOption(layout, axes, {
        series: allSeries,
        legendData,
        containerSize,
        tooltip: { trigger: "axis" as const },
    });
}
