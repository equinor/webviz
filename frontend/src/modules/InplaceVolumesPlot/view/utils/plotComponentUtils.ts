import type { PlotData } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import { makePlotlyBarTraces, type BarSortBy } from "./plotly/bar";
import { makePlotlyBoxPlotTraces } from "./plotly/box";
import { makePlotlyConvergenceTraces } from "./plotly/convergence";
import { makePlotlyDensityTraces } from "./plotly/distribution";
import { makePlotlyHistogramTraces } from "./plotly/histogram";
import { makePlotlyScatterTraces } from "./plotly/scatter";

export function makeFormatLabelFunction(
    ensembleSet: EnsembleSet,
): (columnName: string, value: string | number) => string {
    return function formatLabel(columnName: string, value: string | number): string {
        if (columnName === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(value.toString());
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                return makeDistinguishableEnsembleDisplayName(ensembleIdent, ensembleSet.getRegularEnsembleArray());
            }
        }
        return value.toString();
    };
}

export function makePlotData(
    plotType: PlotType,
    firstResultName: string,
    secondResultNameOrSelectorName: string,
    colorBy: string,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    histogramBins: number,
    barSortBy: BarSortBy,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
    hasMultipleTraces: boolean,
): (table: Table) => Partial<PlotData>[] {
    return (table: Table): Partial<PlotData>[] => {
        // Maps to store already used colors and position for each key for consistency across subplots
        const keyToColor: Map<string, string> = new Map();
        const boxPlotKeyToPositionMap: Map<string, number> = new Map();
        if (table.getColumn(colorBy) === undefined) {
            throw new Error(`Column to color by "${colorBy}" not found in the table.`);
        }

        const needsColorByColumn =
            (plotType === PlotType.BAR && colorBy === secondResultNameOrSelectorName) ||
            (plotType === PlotType.SCATTER && colorBy === secondResultNameOrSelectorName);

        const collection = table.splitByColumn(colorBy, needsColorByColumn);

        const data: Partial<PlotData>[] = [];
        let color = colorSet.getFirstColor();
        for (const [key, table] of collection.getCollectionMap()) {
            let title = key.toString();
            if (colorBy === TableOriginKey.ENSEMBLE) {
                const ensembleIdent = RegularEnsembleIdent.fromString(key.toString());
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    color = ensemble.getColor();
                    title = makeDistinguishableEnsembleDisplayName(
                        ensembleIdent,
                        ensembleSet.getRegularEnsembleArray(),
                    );
                }
            }

            // Extract color or current collection key
            let keyColor = keyToColor.get(key.toString());
            if (keyColor === undefined) {
                keyColor = color;
                keyToColor.set(key.toString(), keyColor);
                color = colorSet.getNextColor();
            }

            if (plotType === PlotType.HISTOGRAM) {
                data.push(
                    ...makeHistogram(
                        title,
                        table,
                        firstResultName,
                        keyColor,
                        histogramBins,
                        showStatisticalMarkers,
                        showRealizationPoints,
                        !hasMultipleTraces,
                    ),
                );
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, firstResultName, keyColor));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(...makeDensityPlot(title, table, firstResultName, keyColor, showRealizationPoints));
            } else if (plotType === PlotType.BOX) {
                let yAxisPosition = boxPlotKeyToPositionMap.get(key.toString());
                if (yAxisPosition === undefined) {
                    yAxisPosition = -boxPlotKeyToPositionMap.size; // Negative value for placing top down
                    boxPlotKeyToPositionMap.set(key.toString(), yAxisPosition);
                }
                data.push(
                    ...makeBoxPlot(
                        title,
                        table,
                        firstResultName,
                        keyColor,
                        yAxisPosition,
                        showStatisticalMarkers,
                        showRealizationPoints,
                    ),
                );
            } else if (plotType === PlotType.SCATTER) {
                data.push(...makeScatterPlot(title, table, firstResultName, secondResultNameOrSelectorName, keyColor));
            } else if (plotType === PlotType.BAR) {
                data.push(
                    ...makeBarPlot(
                        title,
                        table,
                        firstResultName,
                        secondResultNameOrSelectorName,
                        keyColor,
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
    const realValues = table.getColumn("REAL")?.getAllRowValues() as number[];
    const resultValues = table.getColumn(resultName)?.getAllRowValues() as number[];
    if (!realValues) {
        throw new Error("REAL column not found");
    }
    if (!resultValues) {
        return [];
    }
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
    showStatisticalLabels: boolean,
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
        showStatisticalLabels,
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

function makeScatterPlot(
    title: string,
    table: Table,
    firstResultName: string,
    secondResultName: string,
    color: string,
): Partial<PlotData>[] {
    const firstResultColumn = table.getColumn(firstResultName);
    if (!firstResultColumn) {
        return [];
    }

    const secondResultColumn = table.getColumn(secondResultName);
    if (!secondResultColumn) {
        return [];
    }

    return makePlotlyScatterTraces({
        title,
        xValues: firstResultColumn.getAllRowValues() as number[],
        yValues: secondResultColumn.getAllRowValues() as number[],
        realizations:
            table
                .getColumn("REAL")
                ?.getAllRowValues()
                .map((v) => v.toString()) ?? [],
        color,
        xAxisLabel: firstResultName,
        yAxisLabel: secondResultName,
    });
}
