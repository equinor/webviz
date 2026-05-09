import type { Layout, PlotData } from "plotly.js";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import {
    ColorBy,
    CurveType,
    GroupBy,
    type RelPermCurveEntry,
    type RelPermDataAccessorLike,
    YAxisScale,
} from "../../typesAndEnums";

type FanchartGroup = {
    key: string;
    colorByValue: string;
    subplotValue: string;
    name: string;
    entries: RelPermCurveEntry[];
};

type SubplotDefinition = {
    key: string;
    title: string;
};

export type RelPermFanchartStatistics = {
    saturationValues: number[];
    minValues: number[];
    p90Values: number[];
    p50Values: number[];
    p10Values: number[];
    maxValues: number[];
};

export class RelPermPlotBuilder {
    private _dataAccessor: RelPermDataAccessorLike;
    private _selectedEnsembles: RegularEnsemble[];
    private _colorSet: ColorSet;

    constructor(dataAccessor: RelPermDataAccessorLike, selectedEnsembles: RegularEnsemble[], colorSet: ColorSet) {
        this._dataAccessor = dataAccessor;
        this._selectedEnsembles = selectedEnsembles;
        this._colorSet = colorSet;
    }

    makeTraces(colorBy: ColorBy, groupBy: GroupBy): Partial<PlotData>[] {
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const subplotIndexMap = this.makeSubplotIndexMap(groupBy);
        const seenLegendGroups = new Set<string>();

        return this._dataAccessor.getEntries().map((entry) => {
            const colorByValue = this.makeColorByValue(entry, colorBy);
            const color = colorByValueMap.get(colorByValue) ?? this._colorSet.getFirstColor();
            const ensembleDisplayName = this.makeEnsembleDisplayName(entry.ensembleIdent);
            const axisReferences = makeAxisReferences(subplotIndexMap.get(this.makeSubplotValue(entry, groupBy)) ?? 0);
            const showLegend = !seenLegendGroups.has(colorByValue);
            seenLegendGroups.add(colorByValue);

            return {
                x: entry.saturationValues,
                y: entry.curveValues,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                name: this.makeColorByDisplayName(entry, colorBy),
                legendgroup: colorByValue,
                showlegend: showLegend,
                line: { color, width: 1 },
                hovertemplate:
                    `<b>${entry.curveName}</b>` +
                    `<br>Ensemble: ${ensembleDisplayName}` +
                    `<br>Realization: ${entry.realization}` +
                    `<br>SATNUM: ${entry.satnum}` +
                    `<br>${entry.saturationName}: %{x}` +
                    "<br>Value: %{y}<extra></extra>",
            };
        });
    }

    makeFanchartTraces(colorBy: ColorBy, groupBy: GroupBy): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];
        const groups = this.makeFanchartGroups(colorBy, groupBy);
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const subplotIndexMap = this.makeSubplotIndexMap(groupBy);
        const seenLegendGroups = new Set<string>();

        for (const group of groups) {
            const compatibleEntries = filterEntriesWithSharedSaturationValues(group.entries);
            if (compatibleEntries.length === 0) {
                continue;
            }

            const color = colorByValueMap.get(group.colorByValue) ?? this._colorSet.getFirstColor();
            const axisReferences = makeAxisReferences(subplotIndexMap.get(group.subplotValue) ?? 0);
            const statistics = calculateFanchartStatistics(compatibleEntries);
            if (!statistics) {
                continue;
            }
            const showLegend = !seenLegendGroups.has(group.colorByValue);
            seenLegendGroups.add(group.colorByValue);

            traces.push({
                x: statistics.saturationValues,
                y: statistics.minValues,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: group.key,
            });
            traces.push({
                x: statistics.saturationValues,
                y: statistics.p90Values,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                fill: "tonexty",
                fillcolor: makeTransparentColor(color, 0.12),
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: group.key,
            });
            traces.push({
                x: statistics.saturationValues,
                y: statistics.p10Values,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                fill: "tonexty",
                fillcolor: makeTransparentColor(color, 0.28),
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: group.key,
            });
            traces.push({
                x: statistics.saturationValues,
                y: statistics.maxValues,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                fill: "tonexty",
                fillcolor: makeTransparentColor(color, 0.12),
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: group.key,
            });
            traces.push({
                x: statistics.saturationValues,
                y: statistics.p50Values,
                xaxis: axisReferences.xaxis,
                yaxis: axisReferences.yaxis,
                type: "scatter",
                mode: "lines",
                name: this.makeFanchartLegendName(group, colorBy),
                line: { color, width: 2 },
                legendgroup: group.key,
                showlegend: showLegend,
                customdata: makeFanchartCustomData(statistics),
                hovertemplate:
                    `<b>${group.name}</b>` +
                    "<br>Saturation: %{x}" +
                    "<br>Min: %{customdata[0]}" +
                    "<br>P90: %{customdata[1]}" +
                    "<br>P50: %{customdata[2]}" +
                    "<br>P10: %{customdata[3]}" +
                    "<br>Max: %{customdata[4]}<extra></extra>",
            });
        }

        return traces;
    }

    private makeFanchartLegendName(group: FanchartGroup, colorBy: ColorBy): string {
        if (colorBy === ColorBy.CURVE) {
            return group.colorByValue;
        }
        if (colorBy === ColorBy.SATNUM) {
            return `SATNUM ${group.colorByValue}`;
        }
        const firstEntry = group.entries[0];
        return firstEntry ? this.makeEnsembleDisplayName(firstEntry.ensembleIdent) : group.name;
    }

    makeLayout(
        size: Size2D,
        curveType: CurveType,
        saturationAxisName: string | null,
        groupBy: GroupBy,
        yAxisScale: YAxisScale,
    ): Partial<Layout> {
        const subplotDefinitions = this.makeSubplotDefinitions(groupBy);
        const layout: Partial<Layout> = {
            height: size.height,
            width: size.width,
            margin: { l: 55, r: 20, t: 35, b: 50 },
            hovermode: "closest",
            showlegend: true,
        };
        const yAxisTitle = curveType === CurveType.RELPERM ? "Relative permeability" : "Capillary pressure";
        const axisType = curveType === CurveType.RELPERM && yAxisScale === YAxisScale.LOG ? "log" : "linear";

        if (subplotDefinitions.length === 1) {
            layout.xaxis = { title: saturationAxisName ?? "Saturation", range: [0, 1] };
            layout.yaxis = { title: yAxisTitle, type: axisType };
            return layout;
        }

        const layoutWithDynamicAxes = layout as Partial<Layout> & Record<string, unknown>;
        const subplotSpacing = 0.045;
        const subplotHeight = (1 - subplotSpacing * (subplotDefinitions.length - 1)) / subplotDefinitions.length;
        const annotations: NonNullable<Layout["annotations"]> = [];

        subplotDefinitions.forEach((subplotDefinition, index) => {
            const suffix = index === 0 ? "" : `${index + 1}`;
            const axisReferenceSuffix = index === 0 ? "" : `${index + 1}`;
            const domainTop = 1 - index * (subplotHeight + subplotSpacing);
            const domainBottom = domainTop - subplotHeight;

            layoutWithDynamicAxes[`xaxis${suffix}`] = {
                title: index === subplotDefinitions.length - 1 ? saturationAxisName ?? "Saturation" : undefined,
                range: [0, 1],
                domain: [0, 1],
                anchor: `y${axisReferenceSuffix}`,
            };
            layoutWithDynamicAxes[`yaxis${suffix}`] = {
                title: yAxisTitle,
                type: axisType,
                domain: [domainBottom, domainTop],
                anchor: `x${axisReferenceSuffix}`,
            };
            annotations.push({
                text: subplotDefinition.title,
                x: 0,
                y: domainTop,
                xref: "paper",
                yref: "paper",
                showarrow: false,
                xanchor: "left",
                yanchor: "bottom",
                font: { size: 12 },
            });
        });

        layout.annotations = annotations;
        return layout;
    }

    private makeColorByValueMap(colorBy: ColorBy): Map<string, string> {
        return makeRelPermColorByValueMap(
            this._dataAccessor.getEntries(),
            this._selectedEnsembles,
            colorBy,
            this._colorSet,
        );
    }

    private makeColorByValue(entry: RelPermCurveEntry, colorBy: ColorBy): string {
        return makeRelPermColorByValue(entry, colorBy);
    }

    private makeColorByDisplayName(entry: RelPermCurveEntry, colorBy: ColorBy): string {
        if (colorBy === ColorBy.CURVE) {
            return entry.curveName;
        }
        if (colorBy === ColorBy.SATNUM) {
            return `SATNUM ${entry.satnum}`;
        }
        return this.makeEnsembleDisplayName(entry.ensembleIdent);
    }

    private makeFanchartGroups(colorBy: ColorBy, groupBy: GroupBy): FanchartGroup[] {
        const groups = new Map<string, FanchartGroup>();

        for (const entry of this._dataAccessor.getEntries()) {
            const ensembleDisplayName = this.makeEnsembleDisplayName(entry.ensembleIdent);
            const key = [entry.ensembleIdent.toString(), entry.curveName, entry.satnum].join("-");
            const colorByValue = this.makeColorByValue(entry, colorBy);
            const subplotValue = this.makeSubplotValue(entry, groupBy);
            const name = `${ensembleDisplayName}, ${entry.curveName}, SATNUM ${entry.satnum}`;
            const group = groups.get(key);
            if (group) {
                group.entries.push(entry);
                continue;
            }

            groups.set(key, { key, colorByValue, subplotValue, name, entries: [entry] });
        }

        return Array.from(groups.values());
    }

    private makeSubplotDefinitions(groupBy: GroupBy): SubplotDefinition[] {
        const definitions = new Map<string, SubplotDefinition>();

        for (const entry of this._dataAccessor.getEntries()) {
            const key = this.makeSubplotValue(entry, groupBy);
            if (!definitions.has(key)) {
                definitions.set(key, { key, title: this.makeSubplotTitle(entry, groupBy) });
            }
        }

        return Array.from(definitions.values());
    }

    private makeSubplotIndexMap(groupBy: GroupBy): Map<string, number> {
        return new Map(this.makeSubplotDefinitions(groupBy).map((definition, index) => [definition.key, index]));
    }

    private makeSubplotValue(entry: RelPermCurveEntry, groupBy: GroupBy): string {
        if (groupBy === GroupBy.ENSEMBLE) {
            return entry.ensembleIdent.toString();
        }
        if (groupBy === GroupBy.SATNUM) {
            return entry.satnum.toString();
        }
        return "all";
    }

    private makeSubplotTitle(entry: RelPermCurveEntry, groupBy: GroupBy): string {
        if (groupBy === GroupBy.ENSEMBLE) {
            return this.makeEnsembleDisplayName(entry.ensembleIdent);
        }
        if (groupBy === GroupBy.SATNUM) {
            return `SATNUM ${entry.satnum}`;
        }
        return "";
    }

    private makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, this._selectedEnsembles);
    }
}

export function makeRelPermColorByValueMap(
    entries: RelPermCurveEntry[],
    selectedEnsembles: RegularEnsemble[],
    colorBy: ColorBy,
    colorSet: ColorSet,
): Map<string, string> {
    const values = Array.from(new Set(entries.map((entry) => makeRelPermColorByValue(entry, colorBy))));
    const colorByValueMap = new Map<string, string>();
    let color = colorSet.getFirstColor();

    values.forEach((value) => {
        if (colorBy === ColorBy.ENSEMBLE) {
            const ensemble = selectedEnsembles.find((candidate) => candidate.getIdent().toString() === value);
            if (ensemble) {
                colorByValueMap.set(value, ensemble.getColor());
                return;
            }
        }

        colorByValueMap.set(value, color);
        color = colorSet.getNextColor();
    });

    return colorByValueMap;
}

export function makeRelPermColorByValue(entry: RelPermCurveEntry, colorBy: ColorBy): string {
    if (colorBy === ColorBy.CURVE) {
        return entry.curveName;
    }
    if (colorBy === ColorBy.SATNUM) {
        return entry.satnum.toString();
    }
    return entry.ensembleIdent.toString();
}

function makeAxisReferences(subplotIndex: number): { xaxis: string; yaxis: string } {
    if (subplotIndex === 0) {
        return { xaxis: "x", yaxis: "y" };
    }

    return { xaxis: `x${subplotIndex + 1}`, yaxis: `y${subplotIndex + 1}` };
}

function filterEntriesWithSharedSaturationValues(entries: RelPermCurveEntry[]): RelPermCurveEntry[] {
    const referenceSaturationValues = entries[0]?.saturationValues;
    if (!referenceSaturationValues) {
        return [];
    }

    return entries.filter((entry) => arraysAreEqual(entry.saturationValues, referenceSaturationValues));
}

export function calculateFanchartStatistics(entries: RelPermCurveEntry[]): RelPermFanchartStatistics | null {
    if (entries.length === 0) {
        return null;
    }

    return {
        saturationValues: entries[0].saturationValues,
        minValues: calculateStatisticValues(entries, (values) => Math.min(...values)),
        p90Values: calculateStatisticValues(entries, computeReservesP90),
        p50Values: calculateStatisticValues(entries, computeP50),
        p10Values: calculateStatisticValues(entries, computeReservesP10),
        maxValues: calculateStatisticValues(entries, (values) => Math.max(...values)),
    };
}

export function calculateStatisticValues(
    entries: RelPermCurveEntry[],
    statisticFunction: (values: number[]) => number,
): number[] {
    const numValues = entries[0]?.curveValues.length ?? 0;
    const values: number[] = [];

    for (let valueIndex = 0; valueIndex < numValues; valueIndex++) {
        values.push(statisticFunction(entries.map((entry) => entry.curveValues[valueIndex])));
    }

    return values;
}

function makeFanchartCustomData(statistics: RelPermFanchartStatistics): string[][] {
    return statistics.saturationValues.map((_, index) => [
        formatNumber(statistics.minValues[index]),
        formatNumber(statistics.p90Values[index]),
        formatNumber(statistics.p50Values[index]),
        formatNumber(statistics.p10Values[index]),
        formatNumber(statistics.maxValues[index]),
    ]);
}

function arraysAreEqual(left: number[], right: number[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function makeTransparentColor(color: string, opacity: number): string {
    if (!color.startsWith("#") || color.length !== 7) {
        return color;
    }

    const red = parseInt(color.slice(1, 3), 16);
    const green = parseInt(color.slice(3, 5), 16);
    const blue = parseInt(color.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
