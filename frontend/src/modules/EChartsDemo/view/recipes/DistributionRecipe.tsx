/**
 * Recipe: Distribution charts — histogram, density (KDE), percentile range,
 * exceedance, and convergence. All share DistributionTrace; only the builder
 * call and per-chart options differ.
 *
 * No interaction hooks needed — these are static charts with built-in tooltips.
 */
import React from "react";

import type { EChartsOption } from "echarts";

import type { BaseChartOptions, DistributionTrace, SubplotGroup ,
    HistogramType} from "@modules/_shared/eCharts";
import {
    buildConvergenceChart,
    buildDensityChart,
    buildExceedanceChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    Chart,
    computeSubplotGridLayout
} from "@modules/_shared/eCharts";

import { PlotType } from "../../typesAndEnums";
import { generateDistributionTraces } from "../../utils/syntheticData";

import { makeBaseOptions, type RecipeProps } from "./types";

const ROW_HEIGHT_PX = 350;

export function DistributionRecipe({ viewContext, scrollMode, numSubplots, appliedZoomState, handleDataZoom }: RecipeProps): React.ReactNode {

    // ── Settings ─────────────────────────────────────────────────────────
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const histConfig = viewContext.useSettingsToViewInterfaceValue("histogramDisplayConfig");
    const plConfig = viewContext.useSettingsToViewInterfaceValue("pointsAndLabelsConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    // ── Generate synthetic data (only depends on data shape + coloring) ──
    const groups = React.useMemo(
        () => createDistributionGroups(dataConfig.numSubplots, dataConfig.numGroups, dataConfig.numMembers, plConfig.colorByParameter),
        [dataConfig.numSubplots, dataConfig.numGroups, dataConfig.numMembers, plConfig.colorByParameter],
    );

    // ── Build chart option ───────────────────────────────────────────────
    const echartsOptions = React.useMemo(() => {
        const base = makeBaseOptions({ layoutConfig, appliedZoomState });
        return buildDistributionOption(dataConfig.plotType, groups, base, histConfig, plConfig);
    }, [dataConfig.plotType, groups, histConfig, plConfig, layoutConfig, appliedZoomState]);

    // ── Render ───────────────────────────────────────────────────────────
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
            <Chart option={echartsOptions} onDataZoom={handleDataZoom} />
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function createDistributionGroups(
    numSubplots: number,
    numGroups: number,
    numMembers: number,
    colorByParameter: boolean,
): SubplotGroup<DistributionTrace>[] {
    return Array.from({ length: numSubplots }, (_, i) => ({
        title: `Subplot ${i + 1}`,
        traces: generateDistributionTraces(numGroups, numMembers, i, colorByParameter),
    }));
}

function buildDistributionOption(
    plotType: PlotType,
    groups: SubplotGroup<DistributionTrace>[],
    base: BaseChartOptions,
    histConfig: { histogramBins: number; histogramType: HistogramType },
    plConfig: { showMemberPoints: boolean },
): EChartsOption {
    switch (plotType) {
        case PlotType.Histogram:
            return buildHistogramChart(groups, {
                ...base,
                numBins: histConfig.histogramBins,
                histogramType: histConfig.histogramType,
                showMemberPoints: plConfig.showMemberPoints,
            });
        case PlotType.PercentileRange:
            return buildPercentileRangeChart(groups, {
                ...base,
                showMemberPoints: plConfig.showMemberPoints,
            });
        case PlotType.Density:
            return buildDensityChart(groups, {
                ...base,
                showMemberPoints: plConfig.showMemberPoints,
            });
        case PlotType.Exceedance:
            return buildExceedanceChart(groups, {
                ...base,
                showMemberPoints: plConfig.showMemberPoints,
            });
        case PlotType.Convergence:
            return buildConvergenceChart(groups, { ...base });
        default:
            return {};
    }
}
