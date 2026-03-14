import type { EChartsOption } from "echarts";

import {
    buildBarChart,
    buildConvergenceChart,
    buildDensityChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    type BarTrace,
    type ContainerSize,
    type DistributionTrace,
    type SubplotGroup,
    HistogramType as EChartsHistogramType,
} from "@modules/_shared/eCharts";
import type { HistogramType } from "@modules/_shared/histogram";
import { BarSortBy } from "@modules/_shared/InplaceVolumes/plotOptions";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";

import { PlotType } from "../../typesAndEnums";

import type { GroupedTableData, SubplotGroup as InplaceSubplotGroup } from "./GroupedTableData";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildEchartsOptionArgs {
    groupedData: GroupedTableData;
    plotType: PlotType;
    resultName: string;
    selectorColumn: string | null;
    containerSize: ContainerSize;
    histogramType: HistogramType;
    histogramBins: number;
    barSortBy: BarSortBy;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    showPercentageInHistogram: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
}

export function buildEchartsOption(args: BuildEchartsOptionArgs): EChartsOption | null {
    const { groupedData, plotType, containerSize } = args;

    if (groupedData.getNumSubplots() === 0) return null;

    switch (plotType) {
        case PlotType.HISTOGRAM:
            return buildHistogramChart(
                toDistributionSubplots(groupedData, args.resultName),
                {
                    numBins: args.histogramBins,
                    histogramType: args.histogramType as unknown as EChartsHistogramType,
                    showRealizationPoints: args.showRealizationPoints,
                    showPercentageInBar: args.showPercentageInHistogram,
                    sharedXAxis: args.sharedXAxis,
                    sharedYAxis: args.sharedYAxis,
                },
                containerSize,
            );

        case PlotType.DENSITY:
            return buildDensityChart(
                toDistributionSubplots(groupedData, args.resultName),
                {
                    showRealizationPoints: args.showRealizationPoints,
                    xAxisLabel: args.resultName,
                    sharedXAxis: args.sharedXAxis,
                    sharedYAxis: args.sharedYAxis,
                },
                containerSize,
            );

        case PlotType.BAR:
            return buildBarChart(
                toBarSubplots(groupedData, args.resultName, args.selectorColumn),
                {
                    sortBy: args.barSortBy === BarSortBy.Xvalues ? "categories" : "values",
                    showStatisticalMarkers: args.showStatisticalMarkers,
                    showLabels: true,
                    yAxisLabel: args.resultName,
                    sharedXAxis: args.sharedXAxis,
                    sharedYAxis: args.sharedYAxis,
                },
                containerSize,
            );

        case PlotType.CONVERGENCE:
            return buildConvergenceChart(
                toDistributionSubplots(groupedData, args.resultName),
                {
                    yAxisLabel: args.resultName,
                    sharedXAxis: args.sharedXAxis,
                    sharedYAxis: args.sharedYAxis,
                },
                containerSize,
            );

        case PlotType.PERCENTILE_RANGE:
            return buildPercentileRangeChart(
                toDistributionSubplots(groupedData, args.resultName),
                {
                    showRealizationPoints: args.showRealizationPoints,
                    xAxisLabel: args.resultName,
                    sharedXAxis: args.sharedXAxis,
                    sharedYAxis: args.sharedYAxis,
                },
                containerSize,
            );

        default:
            return null;
    }
}

// ---------------------------------------------------------------------------
// Trace adapters — GroupedTableData → SubplotGroup<TraceType>
// ---------------------------------------------------------------------------

function toDistributionSubplots(groupedData: GroupedTableData, resultName: string): SubplotGroup<DistributionTrace>[] {
    return groupedData.getSubplotGroups().map((group) => ({
        title: group.subplotLabel,
        traces: colorEntriesToDistributionTraces(group, resultName),
    }));
}

function toBarSubplots(
    groupedData: GroupedTableData,
    resultName: string,
    selectorColumn: string | null,
): SubplotGroup<BarTrace>[] {
    return groupedData.getSubplotGroups().map((group) => ({
        title: group.subplotLabel,
        traces: colorEntriesToBarTraces(group, resultName, selectorColumn),
    }));
}

function colorEntriesToDistributionTraces(group: InplaceSubplotGroup, resultName: string): DistributionTrace[] {
    return group.colorEntries
        .map((entry) => {
            const values = getColumnValues(entry.table, resultName);
            if (!values) return null;
            const realizationIds = getColumnValues(entry.table, "REAL");
            return {
                name: entry.colorLabel,
                color: entry.color,
                values,
                ...(realizationIds ? { realizationIds } : {}),
            } satisfies DistributionTrace;
        })
        .filter((t): t is DistributionTrace => t !== null);
}

function colorEntriesToBarTraces(
    group: InplaceSubplotGroup,
    resultName: string,
    selectorColumn: string | null,
): BarTrace[] {
    return group.colorEntries
        .map((entry) => {
            const yValues = getColumnValues(entry.table, resultName);
            const xValues = selectorColumn ? getColumnRawValues(entry.table, selectorColumn) : null;
            if (!yValues || !xValues) return null;

            // Aggregate: mean per category (backend returns per-realization summed data)
            const { categories, values } = aggregateMeanPerCategory(xValues, yValues);

            return {
                name: entry.colorLabel,
                color: entry.color,
                categories,
                values,
            };
        })
        .filter((t): t is BarTrace => t !== null);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColumnValues(table: Table, columnName: string): number[] | null {
    const column = table.getColumn(columnName);
    if (!column) return null;
    return column.getAllRowValues() as number[];
}

function getColumnRawValues(table: Table, columnName: string): (string | number)[] | null {
    const column = table.getColumn(columnName);
    if (!column) return null;
    return column.getAllRowValues();
}

function aggregateMeanPerCategory(
    xValues: (string | number)[],
    yValues: number[],
): { categories: (string | number)[]; values: number[] } {
    const sums = new Map<string | number, number>();
    const counts = new Map<string | number, number>();

    for (let i = 0; i < xValues.length; i++) {
        const x = xValues[i];
        sums.set(x, (sums.get(x) ?? 0) + yValues[i]);
        counts.set(x, (counts.get(x) ?? 0) + 1);
    }

    const categories: (string | number)[] = [];
    const values: number[] = [];
    for (const [x, sum] of sums) {
        categories.push(x);
        values.push(sum / (counts.get(x) ?? 1));
    }

    return { categories, values };
}
