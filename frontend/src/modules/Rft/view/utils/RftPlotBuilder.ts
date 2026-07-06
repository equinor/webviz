import { formatRgb, parse } from "culori";
import type { Layout, PlotData } from "plotly.js";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { Size2D } from "@lib/utils/geometry";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";

import {
    RFT_STATISTIC_LABELS,
    type RftDataAccessorLike,
    type RftEnsembleObservationRows,
    type RftRealizationCurve,
    RftStatistic,
} from "../../typesAndEnums";
import { interpolateValueAtDepth } from "../../utils/curveUtils";

// Color used for traces whose ensemble can no longer be resolved (e.g. removed from the ensemble set).
// A neutral gray makes such traces visually distinct instead of reusing the first ensemble's color.
export const MISSING_ENSEMBLE_COLOR = "#808080";


type EnsembleStatisticGroup = {
    ensembleIdent: RegularEnsembleIdent;
    entries: RftRealizationCurve[];
};

export type RftFanchartStatistics = {
    depths: number[];
    minValues: number[];
    p90Values: number[];
    p50Values: number[];
    meanValues: number[];
    p10Values: number[];
    maxValues: number[];
};

export class RftPlotBuilder {
    private _dataAccessor: RftDataAccessorLike;
    private _selectedEnsembles: RegularEnsemble[];

    constructor(dataAccessor: RftDataAccessorLike, selectedEnsembles: RegularEnsemble[]) {
        this._dataAccessor = dataAccessor;
        this._selectedEnsembles = selectedEnsembles;
    }

    makeLegendTraces(shownLegendEnsembles = new Set<string>()): Partial<PlotData>[] {
        const firstEntryByEnsemble = new Map<string, RftRealizationCurve>();

        for (const entry of this._dataAccessor.getEntries()) {
            const ensembleKey = entry.ensembleIdent.toString();
            if (!firstEntryByEnsemble.has(ensembleKey)) {
                firstEntryByEnsemble.set(ensembleKey, entry);
            }
        }

        // Register every ensemble as having a legend entry before producing the traces, so the
        // mutation of the shared set is an explicit step rather than a side-effect hidden in `map`.
        for (const ensembleKey of firstEntryByEnsemble.keys()) {
            shownLegendEnsembles.add(ensembleKey);
        }

        return Array.from(firstEntryByEnsemble.entries()).map(([ensembleKey, entry]) => {
            return {
                x: [null],
                y: [null],
                type: "scatter",
                mode: "lines",
                name: this.makeEnsembleDisplayName(entry.ensembleIdent),
                legendgroup: ensembleKey,
                showlegend: true,
                line: { color: this.makeEnsembleColor(entry.ensembleIdent), width: 2.5 },
                hoverinfo: "skip",
            };
        });
    }

    makeIndividualRealizationTraces(
        responseName: string,
        shownLegendEnsembles = new Set<string>(),
    ): Partial<PlotData>[] {
        return this._dataAccessor.getEntries().map((entry) => {
            const ensembleKey = entry.ensembleIdent.toString();
            const ensembleDisplayName = this.makeEnsembleDisplayName(entry.ensembleIdent);
            const showLegend = shouldShowLegend(ensembleKey, shownLegendEnsembles);

            return {
                x: entry.values,
                y: entry.depths,
                type: "scatter",
                mode: "lines",
                name: ensembleDisplayName,
                legendgroup: ensembleKey,
                showlegend: showLegend,
                opacity: 0.35,
                line: { color: this.makeEnsembleColor(entry.ensembleIdent), width: 0.75 },
                hovertemplate:
                    `<b>${ensembleDisplayName}</b>` +
                    `<br>Realization: ${entry.realization}` +
                    `<br>${responseName}: %{x}` +
                    "<br>Depth: %{y}<extra></extra>",
            };
        });
    }

    makeStatisticLineTraces(
        responseName: string,
        selectedStatistics: RftStatistic[],
        shownLegendEnsembles = new Set<string>(),
    ): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];

        for (const group of this.makeStatisticGroups()) {
            const statistics = calculateFanchartStatistics(group.entries);
            if (!statistics) {
                continue;
            }

            const ensembleKey = group.ensembleIdent.toString();
            const color = this.makeEnsembleColor(group.ensembleIdent);
            const ensembleDisplayName = this.makeEnsembleDisplayName(group.ensembleIdent);
            const showLegend = shouldShowLegend(ensembleKey, shownLegendEnsembles);

            selectedStatistics.forEach((statistic, index) => {
                traces.push({
                    x: getStatisticValues(statistics, statistic),
                    y: statistics.depths,
                    type: "scatter",
                    mode: "lines",
                    name: ensembleDisplayName,
                    line: {
                        color,
                        width: statistic === RftStatistic.MEAN ? 3 : 2.25,
                        dash: getStatisticLineDash(statistic),
                    },
                    legendgroup: ensembleKey,
                    showlegend: index === 0 && showLegend,
                    customdata: statistics.depths.map(() => RFT_STATISTIC_LABELS[statistic]),
                    hovertemplate:
                        `<b>${ensembleDisplayName}</b>` +
                        "<br>Statistic: %{customdata}" +
                        `<br>${responseName}: %{x}` +
                        "<br>Depth: %{y}<extra></extra>",
                });
            });
        }

        return traces;
    }

    makeStatisticFanTraces(shownLegendEnsembles = new Set<string>()): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];

        for (const group of this.makeStatisticGroups()) {
            const statistics = calculateFanchartStatistics(group.entries);
            if (!statistics) {
                continue;
            }

            const ensembleKey = group.ensembleIdent.toString();
            const color = this.makeEnsembleColor(group.ensembleIdent);
            const showLegend = shouldShowLegend(ensembleKey, shownLegendEnsembles);

            traces.push({
                x: statistics.minValues,
                y: statistics.depths,
                type: "scatter",
                mode: "lines",
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: ensembleKey,
            });
            traces.push({
                x: statistics.p90Values,
                y: statistics.depths,
                type: "scatter",
                mode: "lines",
                fill: "tonextx",
                fillcolor: makeTransparentColor(color, 0.12),
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: ensembleKey,
            });
            traces.push({
                x: statistics.p10Values,
                y: statistics.depths,
                type: "scatter",
                mode: "lines",
                fill: "tonextx",
                fillcolor: makeTransparentColor(color, 0.28),
                line: { color, width: 0 },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup: ensembleKey,
            });
            traces.push({
                x: statistics.maxValues,
                y: statistics.depths,
                type: "scatter",
                mode: "lines",
                fill: "tonextx",
                fillcolor: makeTransparentColor(color, 0.12),
                line: { color, width: 0 },
                hoverinfo: "skip",
                name: this.makeEnsembleDisplayName(group.ensembleIdent),
                showlegend: showLegend,
                legendgroup: ensembleKey,
            });
        }

        return traces;
    }

    makeObservationTraces(
        observationsPerEnsemble: RftEnsembleObservationRows[],
        responseName: string,
        shownLegendEnsembles = new Set<string>(),
    ): Partial<PlotData>[] {
        const traces: Partial<PlotData>[] = [];

        for (const ensembleObservations of observationsPerEnsemble) {
            const observations = ensembleObservations.observations;
            if (observations.length === 0) {
                continue;
            }

            const ensembleKey = ensembleObservations.ensembleIdent.toString();
            const color = this.makeEnsembleColor(ensembleObservations.ensembleIdent);
            const ensembleDisplayName = this.makeEnsembleDisplayName(ensembleObservations.ensembleIdent);
            const showLegend = shouldShowLegend(ensembleKey, shownLegendEnsembles);

            traces.push({
                x: observations.map(function getObservationValue(observation) {
                    return observation.value;
                }),
                y: observations.map(function getObservationDepth(observation) {
                    return observation.tvd;
                }),
                type: "scatter",
                mode: "markers",
                name: ensembleDisplayName,
                legendgroup: ensembleKey,
                showlegend: showLegend,
                marker: { color, size: 8, symbol: "diamond", line: { color: "black", width: 1 } },
                error_x: {
                    type: "data",
                    array: observations.map(function getObservationError(observation) {
                        return observation.error;
                    }),
                    visible: true,
                    color,
                    thickness: 1,
                    width: 4,
                },
                customdata: observations.map(function getObservationCustomData(observation) {
                    return [observation.error, observation.zone ?? "N/A"];
                }),
                hovertemplate:
                    `<b>${ensembleDisplayName} observation</b>` +
                    `<br>${responseName}: %{x}` +
                    "<br>Depth: %{y}" +
                    "<br>Error: %{customdata[0]}" +
                    "<br>Zone: %{customdata[1]}<extra></extra>",
            });
        }

        return traces;
    }

    static makeLayout(size: Size2D, responseName: string, valueRange: [number, number] | null): Partial<Layout> {
        return {
            height: size.height,
            width: size.width,
            margin: { l: 60, r: 20, t: 20, b: 50 },
            hovermode: "closest",
            showlegend: true,
            xaxis: {
                title: responseName,
                range: valueRange ?? undefined,
            },
            yaxis: {
                title: "Depth (TVD)",
                autorange: "reversed",
            },
        };
    }

    private makeStatisticGroups(): EnsembleStatisticGroup[] {
        const groups = new Map<string, EnsembleStatisticGroup>();

        for (const entry of this._dataAccessor.getEntries()) {
            const key = entry.ensembleIdent.toString();
            const group = groups.get(key);
            if (group) {
                group.entries.push(entry);
                continue;
            }

            groups.set(key, { ensembleIdent: entry.ensembleIdent, entries: [entry] });
        }

        return Array.from(groups.values());
    }

    private makeEnsembleColor(ensembleIdent: RegularEnsembleIdent): string {
        const ensemble = this._selectedEnsembles.find(
            (candidate) => candidate.getIdent().toString() === ensembleIdent.toString(),
        );
        if (!ensemble) {
            console.error(`Could not resolve color for ensemble ${ensembleIdent.toString()}: not among selected ensembles.`);
            return MISSING_ENSEMBLE_COLOR;
        }
        return ensemble.getColor();
    }

    private makeEnsembleDisplayName(ensembleIdent: RegularEnsembleIdent): string {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, this._selectedEnsembles);
    }
}

function shouldShowLegend(ensembleKey: string, shownLegendEnsembles: Set<string>): boolean {
    if (shownLegendEnsembles.has(ensembleKey)) {
        return false;
    }

    shownLegendEnsembles.add(ensembleKey);
    return true;
}

function resampleEntriesToCommonDepths(entries: RftRealizationCurve[]): RftRealizationCurve[] {
    const commonDepths = makeCommonDepthGrid(entries);
    if (commonDepths.length === 0) {
        return [];
    }

    return entries.map((entry) => {
        // Entries are already sorted by depth (RftDataAccessor sorts on construction), so interpolate directly.
        return {
            ...entry,
            depths: commonDepths,
            values: commonDepths.map((depth) => interpolateValueAtDepth(entry.depths, entry.values, depth)),
        };
    });
}

function makeCommonDepthGrid(entries: RftRealizationCurve[]): number[] {
    const depthSet = new Set<number>();
    for (const entry of entries) {
        for (const depth of entry.depths) {
            depthSet.add(depth);
        }
    }
    return Array.from(depthSet).sort((left, right) => left - right);
}

export function calculateFanchartStatistics(entries: RftRealizationCurve[]): RftFanchartStatistics | null {
    if (entries.length === 0) {
        return null;
    }

    const resampledEntries = resampleEntriesToCommonDepths(entries);
    if (resampledEntries.length === 0) {
        return null;
    }

    return {
        depths: resampledEntries[0].depths,
        minValues: calculateStatisticValues(resampledEntries, computeMin),
        p90Values: calculateStatisticValues(resampledEntries, computeReservesP90),
        p50Values: calculateStatisticValues(resampledEntries, computeP50),
        meanValues: calculateStatisticValues(resampledEntries, calculateMean),
        p10Values: calculateStatisticValues(resampledEntries, computeReservesP10),
        maxValues: calculateStatisticValues(resampledEntries, computeMax),
    };
}

export function calculateStatisticValues(
    entries: RftRealizationCurve[],
    statisticFunction: (values: number[]) => number,
): number[] {
    const numValues = entries[0]?.values.length ?? 0;
    const values: number[] = [];

    for (let valueIndex = 0; valueIndex < numValues; valueIndex++) {
        const finiteValues = entries.map((entry) => entry.values[valueIndex]).filter((value) => Number.isFinite(value));
        values.push(finiteValues.length > 0 ? statisticFunction(finiteValues) : Number.NaN);
    }

    return values;
}

function calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeMin(values: number[]): number {
    return values.reduce((min, value) => (value < min ? value : min), Number.POSITIVE_INFINITY);
}

function computeMax(values: number[]): number {
    return values.reduce((max, value) => (value > max ? value : max), Number.NEGATIVE_INFINITY);
}

function getStatisticValues(statistics: RftFanchartStatistics, statistic: RftStatistic): number[] {
    if (statistic === RftStatistic.MIN) return statistics.minValues;
    if (statistic === RftStatistic.P90) return statistics.p90Values;
    if (statistic === RftStatistic.P50) return statistics.p50Values;
    if (statistic === RftStatistic.MEAN) return statistics.meanValues;
    if (statistic === RftStatistic.P10) return statistics.p10Values;
    return statistics.maxValues;
}

function getStatisticLineDash(statistic: RftStatistic): PlotData["line"]["dash"] {
    if (statistic === RftStatistic.MEAN) return "solid";
    if (statistic === RftStatistic.P50) return "dot";
    if (statistic === RftStatistic.MIN || statistic === RftStatistic.MAX) return "dash";
    return "dashdot";
}

function makeTransparentColor(color: string, opacity: number): string {
    const parsed = parse(color);
    if (!parsed) {
        return color;
    }
    return formatRgb({ ...parsed, alpha: opacity });
}
