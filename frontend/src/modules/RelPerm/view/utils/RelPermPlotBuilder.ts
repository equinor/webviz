import type { Layout, PlotData } from "plotly.js";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import {
    ColorBy,
    CurveType,
    GroupBy,
    REL_PERM_STATISTIC_LABELS,
    type RelPermCurveEntry,
    type RelPermDataAccessorLike,
    RelPermStatistic,
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

type DynamicAxisLayout = Partial<Layout> & {
    [axisName: `xaxis${string}` | `yaxis${string}`]:
        | NonNullable<Layout["xaxis"]>
        | NonNullable<Layout["yaxis"]>
        | undefined;
};
type XAxisAnchor = NonNullable<NonNullable<Layout["xaxis"]>["anchor"]>;
type YAxisAnchor = NonNullable<NonNullable<Layout["yaxis"]>["anchor"]>;

export type RelPermFanchartStatistics = {
    saturationValues: number[];
    minValues: number[];
    p90Values: number[];
    p50Values: number[];
    meanValues: number[];
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

    makeLegendTraces(colorBy: ColorBy, shownLegendColorByValues = new Set<string>()): Partial<PlotData>[] {
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const firstEntryByColorByValue = new Map<string, RelPermCurveEntry>();

        for (const entry of this._dataAccessor.getEntries()) {
            const colorByValue = this.makeColorByValue(entry, colorBy);
            if (!firstEntryByColorByValue.has(colorByValue)) {
                firstEntryByColorByValue.set(colorByValue, entry);
            }
        }

        return Array.from(firstEntryByColorByValue.entries()).map(([colorByValue, entry]) => {
            shownLegendColorByValues.add(colorByValue);
            return {
                x: [null],
                y: [null],
                type: "scatter",
                mode: "lines",
                name: this.makeColorByDisplayName(entry, colorBy),
                legendgroup: colorByValue,
                showlegend: true,
                line: { color: colorByValueMap.get(colorByValue) ?? this._colorSet.getFirstColor(), width: 2.5 },
                hoverinfo: "skip",
            };
        });
    }

    makeIndividualRealizationTraces(
        colorBy: ColorBy,
        groupBy: GroupBy,
        shownLegendColorByValues = new Set<string>(),
    ): Partial<PlotData>[] {
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const subplotIndexMap = this.makeSubplotIndexMap(groupBy);

        return this._dataAccessor.getEntries().map((entry) => {
            const colorByValue = this.makeColorByValue(entry, colorBy);
            const color = colorByValueMap.get(colorByValue) ?? this._colorSet.getFirstColor();
            const ensembleDisplayName = this.makeEnsembleDisplayName(entry.ensembleIdent);
            const axisReferences = makeAxisReferences(subplotIndexMap.get(this.makeSubplotValue(entry, groupBy)) ?? 0);
            const showLegend = shouldShowLegend(colorByValue, shownLegendColorByValues);

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
                opacity: 0.35,
                line: { color, width: 0.75 },
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

    makeStatisticLineTraces(
        colorBy: ColorBy,
        groupBy: GroupBy,
        selectedStatistics: RelPermStatistic[],
        shownLegendColorByValues = new Set<string>(),
    ): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];
        const groups = this.makeStatisticGroups(colorBy, groupBy);
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const subplotIndexMap = this.makeSubplotIndexMap(groupBy);

        for (const group of groups) {
            const compatibleEntries = filterEntriesWithSharedSaturationValues(group.entries);
            const statistics = calculateFanchartStatistics(compatibleEntries);
            if (!statistics) {
                continue;
            }

            const color = colorByValueMap.get(group.colorByValue) ?? this._colorSet.getFirstColor();
            const axisReferences = makeAxisReferences(subplotIndexMap.get(group.subplotValue) ?? 0);
            const showLegend = shouldShowLegend(group.colorByValue, shownLegendColorByValues);
            selectedStatistics.forEach((statistic, index) => {
                traces.push({
                    x: statistics.saturationValues,
                    y: getStatisticValues(statistics, statistic),
                    xaxis: axisReferences.xaxis,
                    yaxis: axisReferences.yaxis,
                    type: "scatter",
                    mode: "lines",
                    name: this.makeStatisticLegendName(group, colorBy),
                    line: {
                        color,
                        width: statistic === RelPermStatistic.MEAN ? 3 : 2.25,
                        dash: getStatisticLineDash(statistic),
                    },
                    legendgroup: group.colorByValue,
                    showlegend: index === 0 && showLegend,
                    customdata: statistics.saturationValues.map(() => REL_PERM_STATISTIC_LABELS[statistic]),
                    hovertemplate:
                        `<b>${group.name}</b>` +
                        "<br>Statistic: %{customdata}" +
                        "<br>Saturation: %{x}" +
                        "<br>Value: %{y}<extra></extra>",
                });
            });
        }

        return traces;
    }

    makeStatisticFanTraces(
        colorBy: ColorBy,
        groupBy: GroupBy,
        shownLegendColorByValues = new Set<string>(),
    ): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];
        const groups = this.makeStatisticGroups(colorBy, groupBy);
        const colorByValueMap = this.makeColorByValueMap(colorBy);
        const subplotIndexMap = this.makeSubplotIndexMap(groupBy);

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
            const showLegend = shouldShowLegend(group.colorByValue, shownLegendColorByValues);

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
                legendgroup: group.colorByValue,
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
                legendgroup: group.colorByValue,
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
                legendgroup: group.colorByValue,
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
                name: this.makeStatisticLegendName(group, colorBy),
                showlegend: showLegend,
                legendgroup: group.colorByValue,
            });
        }

        return traces;
    }

    private makeStatisticLegendName(group: FanchartGroup, colorBy: ColorBy): string {
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

        const layoutWithDynamicAxes = layout as DynamicAxisLayout;
        const subplotSpacing = 0.045;
        const subplotHeight = (1 - subplotSpacing * (subplotDefinitions.length - 1)) / subplotDefinitions.length;
        const annotations: NonNullable<Layout["annotations"]> = [];

        subplotDefinitions.forEach((subplotDefinition, index) => {
            const suffix = index === 0 ? "" : `${index + 1}`;
            const axisReferenceSuffix = index === 0 ? "" : `${index + 1}`;
            const domainTop = 1 - index * (subplotHeight + subplotSpacing);
            const domainBottom = domainTop - subplotHeight;

            layoutWithDynamicAxes[`xaxis${suffix}`] = {
                title: index === subplotDefinitions.length - 1 ? (saturationAxisName ?? "Saturation") : undefined,
                range: [0, 1],
                domain: [0, 1],
                anchor: makeYAxisAnchor(axisReferenceSuffix),
            };
            layoutWithDynamicAxes[`yaxis${suffix}`] = {
                title: yAxisTitle,
                type: axisType,
                domain: [domainBottom, domainTop],
                anchor: makeXAxisAnchor(axisReferenceSuffix),
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

    private makeStatisticGroups(colorBy: ColorBy, groupBy: GroupBy): FanchartGroup[] {
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

function makeXAxisAnchor(axisReferenceSuffix: string): XAxisAnchor {
    return `x${axisReferenceSuffix}` as XAxisAnchor;
}

function makeYAxisAnchor(axisReferenceSuffix: string): YAxisAnchor {
    return `y${axisReferenceSuffix}` as YAxisAnchor;
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

function shouldShowLegend(colorByValue: string, shownLegendColorByValues: Set<string>): boolean {
    if (shownLegendColorByValues.has(colorByValue)) {
        return false;
    }

    shownLegendColorByValues.add(colorByValue);
    return true;
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
        meanValues: calculateStatisticValues(entries, calculateMean),
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

function calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getStatisticValues(statistics: RelPermFanchartStatistics, statistic: RelPermStatistic): number[] {
    if (statistic === RelPermStatistic.MIN) return statistics.minValues;
    if (statistic === RelPermStatistic.P90) return statistics.p90Values;
    if (statistic === RelPermStatistic.P50) return statistics.p50Values;
    if (statistic === RelPermStatistic.MEAN) return statistics.meanValues;
    if (statistic === RelPermStatistic.P10) return statistics.p10Values;
    return statistics.maxValues;
}

function getStatisticLineDash(statistic: RelPermStatistic): PlotData["line"]["dash"] {
    if (statistic === RelPermStatistic.MEAN) return "solid";
    if (statistic === RelPermStatistic.P50) return "dot";
    if (statistic === RelPermStatistic.MIN || statistic === RelPermStatistic.MAX) return "dash";
    return "dashdot";
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
