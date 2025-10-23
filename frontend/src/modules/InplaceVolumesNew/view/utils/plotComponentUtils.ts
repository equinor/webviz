import type { Axis, PlotData, Shape } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import type { InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/settings/components/inplaceVolumesPlotOptionsDialog";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { InplaceVolumesTable } from "./inplaceVolumesTable";
import { makeBarPlot } from "./plotly/bar";
import { makeBoxPlot } from "./plotly/box";
import { makeConvergencePlot } from "./plotly/convergence";
import { makeDistributionPlot } from "./plotly/distribution";
import { makeHistogram } from "./plotly/histogram";
import { makeScatterPlot } from "./plotly/scatter";

/**
 * Filters an array to only numeric values, excluding NaN
 */
function filterToValidNumbers(values: unknown[]): number[] {
    return values.filter((v): v is number => typeof v === "number" && !isNaN(v));
}

/**
 * Validates and aligns multiple arrays, keeping only indices where all values are valid
 * Returns arrays of the same length with valid values at matching indices
 */
function validateAndAlignArrays(
    arrays: { values: unknown[]; validateAs: "number" | "any" }[],
): (number | string | unknown)[][] {
    const length = arrays[0]?.values.length ?? 0;

    // Find indices where all values are valid
    const validIndices: number[] = [];
    for (let i = 0; i < length; i++) {
        const allValid = arrays.every(({ values, validateAs }) => {
            const value = values[i];
            if (validateAs === "number") {
                return typeof value === "number" && !isNaN(value);
            }
            return value !== null && value !== undefined;
        });

        if (allValid) {
            validIndices.push(i);
        }
    }

    // Extract valid values at matching indices
    return arrays.map(({ values }) => validIndices.map((i) => values[i]));
}

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
    plotOptions: InplaceVolumesPlotOptions,
    keyToColor: Map<string, string>,
    boxPlotKeyToPositionMap: Map<string, number>,
): (table: InplaceVolumesTable) => Partial<PlotData>[] {
    return (table: InplaceVolumesTable): Partial<PlotData>[] => {
        if (!table.hasColumn(colorBy)) {
            throw new Error(`Column to color by "${colorBy}" not found in the table.`);
        }

        // Split by color grouping
        const groupedEntries = table.splitByColumn(colorBy);

        const data: Partial<PlotData>[] = [];
        let color = colorSet.getFirstColor();

        for (const entry of groupedEntries) {
            // Get the key value (first element since single column split)
            const keyValue = entry.keyParts[0]?.toString() ?? entry.key;
            let title = keyValue;

            // Handle ensemble-specific coloring
            if (colorBy === TableOriginKey.ENSEMBLE) {
                const ensembleIdent = RegularEnsembleIdent.fromString(keyValue);
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    color = ensemble.getColor();
                    title = makeDistinguishableEnsembleDisplayName(
                        ensembleIdent,
                        ensembleSet.getRegularEnsembleArray(),
                    );
                }
            }

            // Get or assign color for this key
            let keyColor = keyToColor.get(keyValue);
            if (keyColor === undefined) {
                keyColor = color;
                keyToColor.set(keyValue, keyColor);
                color = colorSet.getNextColor();
            }

            // Get raw data for the primary result column
            const rawResultValues = entry.table.getColumn(firstResultName);
            if (!rawResultValues) {
                continue;
            }

            // Generate appropriate plot type with validation specific to each type
            if (plotType === PlotType.HISTOGRAM) {
                const resultValues = filterToValidNumbers(rawResultValues);
                if (resultValues.length === 0) continue;

                data.push(
                    ...makeHistogram(
                        title,
                        resultValues,
                        firstResultName,
                        keyColor,
                        plotOptions.histogramBins,
                        plotOptions.showStatisticalMarkers,
                        plotOptions.showRealizationPoints,
                    ),
                );
            } else if (plotType === PlotType.CONVERGENCE) {
                const rawRealValues = entry.table.getColumn("REAL");
                if (!rawRealValues) continue;

                const [resultValues, realValues] = validateAndAlignArrays([
                    { values: rawResultValues, validateAs: "number" },
                    { values: rawRealValues, validateAs: "number" },
                ]);

                if (resultValues.length === 0) continue;

                data.push(...makeConvergencePlot(title, realValues as number[], resultValues as number[], keyColor));
            } else if (plotType === PlotType.DISTRIBUTION) {
                const resultValues = filterToValidNumbers(rawResultValues);
                if (resultValues.length === 0) continue;

                data.push(...makeDistributionPlot(title, resultValues, keyColor));
            } else if (plotType === PlotType.BOX) {
                const resultValues = filterToValidNumbers(rawResultValues);
                if (resultValues.length === 0) continue;

                let yAxisPosition = boxPlotKeyToPositionMap.get(keyValue);
                if (yAxisPosition === undefined) {
                    yAxisPosition = -boxPlotKeyToPositionMap.size;
                    boxPlotKeyToPositionMap.set(keyValue, yAxisPosition);
                }
                data.push(
                    ...makeBoxPlot(
                        title,
                        resultValues,
                        firstResultName,
                        keyColor,
                        plotOptions.showStatisticalMarkers,
                        plotOptions.showRealizationPoints,
                        yAxisPosition,
                    ),
                );
            } else if (plotType === PlotType.SCATTER) {
                const rawYValues = entry.table.getColumn(secondResultNameOrSelectorName);
                const rawRealValues = entry.table.getColumn("REAL");
                if (!rawYValues || !rawRealValues) continue;

                const [xValues, yValues, realizations] = validateAndAlignArrays([
                    { values: rawResultValues, validateAs: "number" },
                    { values: rawYValues, validateAs: "number" },
                    { values: rawRealValues, validateAs: "any" },
                ]);

                if (xValues.length === 0) continue;

                data.push(
                    ...makeScatterPlot(
                        title,
                        xValues as number[],
                        yValues as number[],
                        realizations.map((r) => r?.toString() ?? ""),
                        keyColor,
                        firstResultName,
                        secondResultNameOrSelectorName,
                    ),
                );
            } else if (plotType === PlotType.BAR) {
                const rawSelectorValues = entry.table.getColumn(secondResultNameOrSelectorName);
                if (!rawSelectorValues) continue;

                const [yValues, xValues] = validateAndAlignArrays([
                    { values: rawResultValues, validateAs: "number" },
                    { values: rawSelectorValues, validateAs: "any" },
                ]);

                if (yValues.length === 0) continue;

                data.push(
                    ...makeBarPlot(
                        title,
                        yValues as number[],
                        xValues as (string | number)[],
                        firstResultName,
                        secondResultNameOrSelectorName,
                        keyColor,
                        plotOptions.barSortBy,
                        plotOptions.showStatisticalMarkers,
                    ),
                );
            }
        }

        return data;
    };
}

/**
 * Creates a highlight shape for a plot when an item is hovered
 */
export function createHighlightShape(): Partial<Shape> {
    return {
        type: "rect",
        line: { color: "blue", width: 2 },
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 1,
        xref: "paper",
        yref: "paper",
    };
}

export function makeAxisOptions(
    plotType: PlotType,
    firstResultName: string | null,
    secondResultName: string | null,
): { xAxisOptions: Partial<Axis>; yAxisOptions: Partial<Axis> } {
    let xAxisOptions: Partial<Axis> = {};
    let yAxisOptions: Partial<Axis> = {};

    if (plotType === PlotType.SCATTER) {
        xAxisOptions = { title: { text: firstResultName ?? "", standoff: 20 } };
        yAxisOptions = { title: { text: secondResultName ?? "", standoff: 20 } };
    } else if (plotType === PlotType.CONVERGENCE) {
        xAxisOptions = { title: { text: "Realizations", standoff: 5 } };
        yAxisOptions = { title: { text: firstResultName ?? "", standoff: 5 } };
    } else if (plotType === PlotType.BOX) {
        yAxisOptions = { showticklabels: false };
    } else if (plotType === PlotType.HISTOGRAM) {
        yAxisOptions = { title: { text: "Percentage (%)" } };
    } else if (plotType === PlotType.BAR) {
        xAxisOptions = {
            type: "category",
            categoryorder: "trace",
            showticklabels: false,
            title: { text: `${secondResultName ?? ""} (hover to see values)`, standoff: 5 },
        };
        yAxisOptions = { title: { text: firstResultName ?? "", standoff: 5 } };
    }

    return { xAxisOptions, yAxisOptions };
}

export function createLegendPlot(traces: Partial<PlotData>[]): PlotItem {
    const legendTraces = traces.map((trace) => ({
        ...trace,
        x: [null],
        y: [null],
        showlegend: trace.showlegend,
    }));

    return {
        id: "legend-plot",
        data: legendTraces,
        layout: {
            xaxis: { visible: false, showgrid: false, zeroline: false },
            yaxis: { visible: false, showgrid: false, zeroline: false },
            showlegend: true,
            legend: {
                orientation: "h",
                y: 0.5,
                x: 0.5,
                xanchor: "center",
                yanchor: "middle",
                tracegroupgap: 0,
                itemclick: false,
                itemdoubleclick: false,
            },
            margin: { t: 5, b: 5, l: 5, r: 5 },
        },
        config: { displayModeBar: false },
    };
}
