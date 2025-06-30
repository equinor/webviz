import { formatRgb, parse } from "culori";
import type { PlotData } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { HistogramBinRange } from "@modules/_shared/histogram";
import { makeHistogramBinRangesFromMinAndMaxValues, makeHistogramTrace } from "@modules/_shared/histogram";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import type { RealizationAndResult } from "./convergenceCalculation";
import { calcConvergenceArray } from "./convergenceCalculation";

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
): (table: Table) => Partial<PlotData>[] {
    return (table: Table): Partial<PlotData>[] => {
        let binRanges: HistogramBinRange[] = [];
        if (plotType === PlotType.HISTOGRAM) {
            const column = table.getColumn(firstResultName);
            if (!column) {
                return [];
            }
            const resultMinAndMax = column.reduce(
                (acc: { min: number; max: number }, value: string | number) => {
                    if (typeof value !== "number") {
                        return acc;
                    }
                    return {
                        min: Math.min(acc.min, value),
                        max: Math.max(acc.max, value),
                    };
                },
                { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
            );
            binRanges = makeHistogramBinRangesFromMinAndMaxValues({
                xMin: resultMinAndMax.min,
                xMax: resultMinAndMax.max,
                numBins: 20,
            });
        }

        if (table.getColumn(colorBy) === undefined) {
            throw new Error(`Column to color by "${colorBy}" not found in the table.`);
        }

        const collection = table.splitByColumn(colorBy);

        let boxPlotColorByPositionMap: Map<string | number, number> = new Map();
        if (plotType === PlotType.BOX) {
            // To distribute the box plots in vertical direction, use index as yAxis position
            if (collection.getNumTables() > 1) {
                const colorByValues = table.getColumn(colorBy)?.getUniqueValues() ?? [];
                boxPlotColorByPositionMap = new Map(colorByValues.map((value, index) => [value.toString(), index]));
            }
        }

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

            if (plotType === PlotType.HISTOGRAM) {
                data.push(...makeHistogram(title, table, firstResultName, color, binRanges));
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, firstResultName, color));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(...makeDensityPlot(title, table, firstResultName, color));
            } else if (plotType === PlotType.BOX) {
                const yAxisPosition = boxPlotColorByPositionMap.get(key.toString());
                data.push(...makeBoxPlot(title, table, firstResultName, color, yAxisPosition));
            } else if (plotType === PlotType.SCATTER) {
                data.push(...makeScatterPlot(title, table, firstResultName, secondResultNameOrSelectorName, color));
            } else if (plotType === PlotType.BAR) {
                data.push(...makeBarPlot(title, table, firstResultName, secondResultNameOrSelectorName, color));
            }

            color = colorSet.getNextColor();
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
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    const selectorColumn = table.getColumn(selectorName);
    if (!selectorColumn) {
        return [];
    }

    data.push({
        x: selectorColumn.getAllRowValues(),
        y: resultColumn.getAllRowValues(),
        name: title,
        type: "bar",
        marker: {
            color,
        },
    });

    return data;
}

function makeConvergencePlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const realizationAndResultArray: RealizationAndResult[] = [];
    const reals = table.getColumn("REAL");
    const results = table.getColumn(resultName);
    if (!reals) {
        throw new Error("REAL column not found");
    }
    if (!results) {
        return [];
    }
    for (let i = 0; i < reals.getNumRows(); i++) {
        realizationAndResultArray.push({
            realization: reals.getRowValue(i) as number,
            resultValue: results.getRowValue(i) as number,
        });
    }

    const convergenceArr = calcConvergenceArray(realizationAndResultArray);

    let lightColor = color;
    const rgbColor = parse(color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    data.push(
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p90),
            name: "P90",
            type: "scatter",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            line: {
                color,
                width: 1,
                dash: "dashdot",
            },
            mode: "lines",
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.mean),
            name: "Mean",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            type: "scatter",
            line: {
                color,
                width: 1,
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p10),
            name: "P10",
            type: "scatter",
            legendgroup: title,
            legendgrouptitle: {
                text: title,
            },
            line: {
                color,
                width: 1,
                dash: "dash",
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
        },
    );

    return data;
}

function makeHistogram(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    binRanges: HistogramBinRange[],
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const histogram = makeHistogramTrace({
        xValues: resultColumn.getAllRowValues() as number[],
        bins: binRanges,
        color,
    });

    histogram.name = title;
    histogram.showlegend = true;

    data.push(histogram);

    return data;
}

function makeDensityPlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues().map((el) => parseFloat(el.toString()));

    data.push({
        x: xValues,
        name: title,
        type: "violin",
        marker: {
            color,
        },
        // @ts-expect-error - arguments in the plotly types
        side: "positive",
        y0: 0,
        orientation: "h",
        spanmode: "hard",
        meanline: { visible: true },
        points: false,
        hoverinfo: "none",
    });

    return data;
}

function makeBoxPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    yAxisPosition?: number,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    data.push({
        x: resultColumn.getAllRowValues(),
        name: title,
        type: "box",
        marker: {
            color,
        },
        // @ts-expect-error - missing arguments in the plotly types
        y0: yAxisPosition ?? 0,
    });

    return data;
}

function makeScatterPlot(
    title: string,
    table: Table,
    firstResultName: string,
    secondResultName: string,
    color: string,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(firstResultName);
    if (!resultColumn) {
        return [];
    }

    const resultColumn2 = table.getColumn(secondResultName);
    if (!resultColumn2) {
        return [];
    }

    data.push({
        x: resultColumn.getAllRowValues(),
        y: resultColumn2.getAllRowValues(),
        name: title,
        mode: "markers",
        marker: {
            color,
            size: 5,
        },
        type: "scatter",
    });

    return data;
}
