import type { PlotData } from "plotly.js";

import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { ColorEntry } from "./GroupedTableData";
import { makePlotlyBarTraces, type BarSortBy } from "./plotly/bar";
import { makePlotlyBoxPlotTraces } from "./plotly/box";
import { makePlotlyConvergenceTraces } from "./plotly/convergence";
import { makePlotlyDensityTraces } from "./plotly/distribution";
import { makePlotlyHistogramTraces } from "./plotly/histogram";

export type MakePlotDataOptions = {
    plotType: PlotType;
    firstResultName: string;
    secondResultNameOrSelectorName: string;
    histogramBins: number;
    barSortBy: BarSortBy;
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    showPercentageInBar: boolean;
};

/**
 * Creates a function that generates plot data from pre-grouped ColorEntry[].
 * This uses the color and label information already computed by GroupedTableData.
 */
export function makePlotData({
    plotType,
    firstResultName,
    secondResultNameOrSelectorName,
    histogramBins,
    barSortBy,
    showStatisticalMarkers,
    showRealizationPoints,
    showPercentageInBar,
}: MakePlotDataOptions): (colorEntries: ColorEntry[]) => Partial<PlotData>[] {
    return (colorEntries: ColorEntry[]): Partial<PlotData>[] => {
        const data: Partial<PlotData>[] = [];
        const boxPlotKeyToPositionMap: Map<string, number> = new Map();

        for (const entry of colorEntries) {
            const { colorLabel: title, color, table } = entry;

            if (plotType === PlotType.HISTOGRAM) {
                data.push(
                    ...makeHistogram(
                        title,
                        table,
                        firstResultName,
                        color,
                        histogramBins,
                        showStatisticalMarkers,
                        showRealizationPoints,
                        showPercentageInBar,
                    ),
                );
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, firstResultName, color));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(...makeDensityPlot(title, table, firstResultName, color, showRealizationPoints));
            } else if (plotType === PlotType.BOX) {
                let yAxisPosition = boxPlotKeyToPositionMap.get(entry.colorKey);
                if (yAxisPosition === undefined) {
                    yAxisPosition = -boxPlotKeyToPositionMap.size; // Negative value for placing top down
                    boxPlotKeyToPositionMap.set(entry.colorKey, yAxisPosition);
                }
                data.push(
                    ...makeBoxPlot(
                        title,
                        table,
                        firstResultName,
                        color,
                        yAxisPosition,
                        showStatisticalMarkers,
                        showRealizationPoints,
                    ),
                );
            } else if (plotType === PlotType.BAR) {
                data.push(
                    ...makeBarPlot(
                        title,
                        table,
                        firstResultName,
                        secondResultNameOrSelectorName,
                        color,
                        barSortBy,
                        showStatisticalMarkers,
                    ),
                );
            }
        }

        return data;
    };
}

function makeBarPlot(
    title: string,
    table: Table,
    resultName: string,
    selectorName: string,
    color: string,
    barSortBy: BarSortBy,
    showStatisticalMarkers: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);

    if (!resultColumn) {
        return [];
    }
    const selectorColumn = table.getColumn(selectorName);
    if (!selectorColumn) {
        return [];
    }

    return makePlotlyBarTraces({
        title,
        yValues: resultColumn.getAllRowValues() as number[],
        xValues: selectorColumn.getAllRowValues(),
        resultName,
        selectorName,
        color,
        barSortBy,
        showStatisticalMarkers,
    });
}

function makeConvergencePlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const realColumn = table.getColumn("REAL");
    const resultColumn = table.getColumn(resultName);
    if (!realColumn) {
        throw new Error("REAL column not found");
    }
    if (!resultColumn) {
        return [];
    }

    const realValues = realColumn.getAllRowValues() as number[];
    const resultValues = resultColumn.getAllRowValues() as number[];
    return makePlotlyConvergenceTraces({ title, realValues, resultValues, color });
}

function makeHistogram(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    numBins: number,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
    showLabels: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    return makePlotlyHistogramTraces({
        title,
        values: resultColumn.getAllRowValues() as number[],
        resultName,
        color,
        numBins,
        showStatisticalMarkers,
        showRealizationPoints,
        showStatisticalLabels: showLabels,
        showPercentageInBar: showLabels,
    });
}

function makeDensityPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    showRealizationPoints: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues().map((el) => parseFloat(el.toString()));

    return makePlotlyDensityTraces({
        title,
        values: xValues,
        color,
        showRealizationPoints,
    });
}

function makeBoxPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    yAxisPosition?: number,
    showStatisticalMarkers?: boolean,
    showRealizationPoints?: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    return makePlotlyBoxPlotTraces({
        title,
        values: resultColumn.getAllRowValues() as number[],
        resultName,
        color,
        yAxisPosition,
        showStatisticalMarkers: showStatisticalMarkers ?? false,
        showRealizationPoints: showRealizationPoints ?? false,
    });
}
