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
    showStatisticalLabels: boolean;
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
    showStatisticalLabels,
}: MakePlotDataOptions): (colorEntries: ColorEntry[]) => Partial<PlotData>[] {
    return (colorEntries: ColorEntry[]): Partial<PlotData>[] => {
        const data: Partial<PlotData>[] = [];

        for (const entry of colorEntries) {
            const { colorLabel: title, color, table } = entry;
            const firstEntryTraceIndex = data.length;

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
                        showStatisticalLabels,
                    ),
                );
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, firstResultName, color));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(
                    ...makeDensityPlot(
                        title,
                        table,
                        firstResultName,
                        color,
                        showRealizationPoints,
                        showStatisticalMarkers,
                        showStatisticalLabels,
                    ),
                );
            } else if (plotType === PlotType.BOX) {
                data.push(
                    ...makeBoxPlot(title, table, firstResultName, color, showStatisticalMarkers, showRealizationPoints),
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

            for (const trace of data.slice(firstEntryTraceIndex)) {
                trace.legendgroup = entry.colorKey;
            }
        }

        return data;
    };
}

/**
 * Keeps a single legend entry per legendgroup: the first trace, across all subplots, that wants one.
 */
export function hideRepeatedLegendEntries(traces: Partial<PlotData>[]): void {
    const groupsWithLegendEntry = new Set<string | undefined>();
    for (const trace of traces) {
        if (trace.showlegend === false) {
            continue;
        }
        if (groupsWithLegendEntry.has(trace.legendgroup)) {
            trace.showlegend = false;
        } else {
            groupsWithLegendEntry.add(trace.legendgroup);
        }
    }
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
    showPercentageInBar: boolean,
    showStatisticalLabels: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    return makePlotlyHistogramTraces({
        title,
        values: resultColumn.getAllRowValues() as number[],
        realizations: getRealizations(table),
        resultName,
        color,
        numBins,
        showStatisticalMarkers,
        showRealizationPoints,
        showStatisticalLabels,
        showPercentageInBar,
    });
}

function makeDensityPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    showRealizationPoints: boolean,
    showStatisticalMarkers: boolean,
    showStatisticalLabels: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues().map((el) => parseFloat(el.toString()));

    return makePlotlyDensityTraces({
        title,
        values: xValues,
        realizations: getRealizations(table),
        color,
        resultName,
        showRealizationPoints,
        showStatisticalMarkers,
        showStatisticalLabels,
    });
}

function makeBoxPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
): Partial<PlotData>[] {
    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    return makePlotlyBoxPlotTraces({
        title,
        values: resultColumn.getAllRowValues() as number[],
        realizations: getRealizations(table),
        resultName,
        color,
        showStatisticalMarkers,
        showRealizationPoints,
    });
}

function getRealizations(table: Table): number[] {
    const realColumn = table.getColumn("REAL");
    if (!realColumn) {
        throw new Error("REAL column not found");
    }
    return realColumn.getAllRowValues() as number[];
}
