import { atom } from "jotai";

import type { VectorRealizationsData_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { PlotDimension } from "../../typesAndEnums";
import type { TimeseriesStatistics } from "../../typesAndEnums";
import { computeRecoveryFactor, computeStatistics, sumAcrossVectors } from "../../utils/aggregation";
import { isInPlaceVector, parseRegionalVector } from "../../utils/regionalVectors";

import {
    colorByAtom,
    ensembleIdentsAtom,
    fipRegionLabelsAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
    showRecoveryFactorAtom,
    subplotByAtom,
} from "./baseAtoms";
import { realizationVectorDataQueriesAtom } from "./queryAtoms";

// ────────── Helpers ──────────

export { isInPlaceVector } from "../../utils/regionalVectors";

export function formatDate(utcMs: number): string {
    return new Date(utcMs).toISOString().slice(0, 10);
}

// ────────── Types ──────────

export type EnsembleVectorData = {
    ensembleIdent: RegularEnsembleIdent;
    vectorsData: VectorRealizationsData_api[];
};

export type AggregatedEnsembleData = {
    ensembleIdent: RegularEnsembleIdent;
    timestamps: number[];
    realizations: number[];
    /** Values summed across all fetched regions [realization][timestep] */
    aggregatedValues: number[][] | null;
    /** Per-region values map: region → [realization][timestep] */
    perRegionValues: Map<number, number[][]>;
    /** Statistics computed from aggregatedValues */
    stats: TimeseriesStatistics | null;
    /** Per-region statistics: region → TimeseriesStatistics */
    perRegionStats: Map<number, TimeseriesStatistics>;
};

// ────────── Fetching state ──────────

export const isDataFetchingAtom = atom<boolean>((get) => {
    const queries = get(realizationVectorDataQueriesAtom);
    return queries.some((q) => q.isFetching);
});

export const allQueriesFailedAtom = atom<boolean>((get) => {
    const queries = get(realizationVectorDataQueriesAtom);
    return queries.length > 0 && queries.every((q) => q.isError);
});

// ────────── Per-ensemble raw data ──────────

/** Pairs each ensemble with its fetched vector data */
export const ensembleVectorDataArrayAtom = atom<EnsembleVectorData[]>((get) => {
    const ensembleIdents = get(ensembleIdentsAtom);
    const queries = get(realizationVectorDataQueriesAtom);

    const result: EnsembleVectorData[] = [];
    for (let i = 0; i < ensembleIdents.length; i++) {
        const q = queries[i];
        if (q?.data) {
            result.push({
                ensembleIdent: ensembleIdents[i],
                vectorsData: q.data as VectorRealizationsData_api[],
            });
        }
    }
    return result;
});

// ────────── Aggregated data per ensemble ──────────

export const aggregatedEnsembleDataArrayAtom = atom<AggregatedEnsembleData[]>((get) => {
    const ensembleVectorDataArray = get(ensembleVectorDataArrayAtom);
    const showRecoveryFactor = get(showRecoveryFactorAtom);
    const selectedVectorBaseName = get(selectedVectorBaseNameAtom);
    const applyRecovery = showRecoveryFactor && isInPlaceVector(selectedVectorBaseName);

    return ensembleVectorDataArray.map(({ ensembleIdent, vectorsData }) => {
        if (vectorsData.length === 0) {
            return {
                ensembleIdent,
                timestamps: [],
                realizations: [],
                aggregatedValues: null,
                perRegionValues: new Map(),
                stats: null,
                perRegionStats: new Map(),
            };
        }

        const timestamps = vectorsData[0].timestampsUtcMs;
        const realizations = vectorsData[0].realizations;

        // Sum across all fetched regions
        let aggregatedValues = sumAcrossVectors(vectorsData);

        // Per-region values
        const perRegionValues = new Map<number, number[][]>();
        for (const vec of vectorsData) {
            const parsed = parseRegionalVector(vec.vectorName);
            if (parsed) {
                perRegionValues.set(parsed.region, vec.valuesPerRealization);
            }
        }

        // Apply recovery factor if applicable
        if (applyRecovery && aggregatedValues) {
            aggregatedValues = computeRecoveryFactor(aggregatedValues);
            for (const [region, vals] of perRegionValues) {
                perRegionValues.set(region, computeRecoveryFactor(vals));
            }
        }

        // Compute statistics
        const stats = aggregatedValues ? computeStatistics(aggregatedValues) : null;

        // Per-region statistics
        const perRegionStats = new Map<number, TimeseriesStatistics>();
        for (const [region, vals] of perRegionValues) {
            perRegionStats.set(region, computeStatistics(vals));
        }

        return {
            ensembleIdent,
            timestamps,
            realizations,
            aggregatedValues,
            perRegionValues,
            stats,
            perRegionStats,
        };
    });
});

// ────────── Chart data atoms ──────────

export type ChartTrace = {
    label: string;
    color: string;
    timestamps: number[];
    stats: TimeseriesStatistics | null;
    realizations: number[];
    aggregatedValues: number[][] | null;
    /** Ensemble ident string — always set since colorBy/subplotBy enforces one ensemble per trace */
    ensembleIdentString: string;
};

export type SubplotGroup = {
    title: string;
    traces: ChartTrace[];
};

// ────────── Helpers for dimension-based grouping ──────────

/**
 * Get the dimension key for a given data point (ensemble index + FIP number).
 */
function getDimensionKey(
    dim: PlotDimension,
    ensembleIdx: number,
    ensembleIdents: RegularEnsembleIdent[],
    fipNumber: number,
    fipRegionLabels: Record<number, { zone: string; region: string }>,
): string {
    switch (dim) {
        case PlotDimension.Ensemble:
            return ensembleIdents[ensembleIdx].getEnsembleName();
        case PlotDimension.FipRegion:
            return String(fipNumber);
        case PlotDimension.Zone:
            return fipRegionLabels[fipNumber]?.zone ?? `FIP ${fipNumber}`;
        case PlotDimension.GeoRegion:
            return fipRegionLabels[fipNumber]?.region ?? `FIP ${fipNumber}`;
    }
}

/**
 * Get a human-readable label for a dimension key.
 */
function getDimensionLabel(dim: PlotDimension, key: string): string {
    switch (dim) {
        case PlotDimension.Ensemble:
            return key;
        case PlotDimension.FipRegion:
            return `Region ${key}`;
        case PlotDimension.Zone:
            return key;
        case PlotDimension.GeoRegion:
            return key;
    }
}

/**
 * Sum multiple `number[][]` arrays element-wise.
 */
function sumValuesArrays(arrays: number[][][]): number[][] | null {
    if (arrays.length === 0) return null;
    if (arrays.length === 1) return arrays[0];

    const numReals = arrays[0].length;
    const numTimesteps = numReals > 0 ? arrays[0][0].length : 0;

    const result: number[][] = Array.from({ length: numReals }, () => new Array(numTimesteps).fill(0));

    for (const arr of arrays) {
        for (let r = 0; r < numReals; r++) {
            for (let t = 0; t < numTimesteps; t++) {
                result[r][t] += arr[r][t];
            }
        }
    }

    return result;
}

/**
 * Build subplot groups based on the colorBy and subplotBy dimensions.
 *
 * - subplotBy=null: everything in one subplot, colored by colorBy dimension.
 * - subplotBy=X: one subplot per unique X value, colored by colorBy dimension.
 * - Dimensions not assigned to colorBy or subplotBy are aggregated (summed).
 */
export const subplotGroupsAtom = atom<SubplotGroup[]>((get) => {
    const aggregatedData = get(aggregatedEnsembleDataArrayAtom);
    const colorBy = get(colorByAtom);
    const subplotBy = get(subplotByAtom);
    const selectedRegions = get(selectedRegionsAtom);
    const ensembleIdents = get(ensembleIdentsAtom);
    const ensembleSet = get(EnsembleSetAtom);
    const fipRegionLabels = get(fipRegionLabelsAtom);

    // Build ensemble name → color map for when colorBy is Ensemble
    const ensembleColorMap = new Map<string, string>();
    for (const ident of ensembleIdents) {
        const color = ensembleSet.findEnsemble(ident)?.getColor();
        if (color) {
            ensembleColorMap.set(ident.getEnsembleName(), color);
        }
    }

    if (!colorBy || aggregatedData.length === 0 || selectedRegions.length === 0) {
        return [];
    }

    // Collect all data points: (ensembleIdx, fipNumber) → values
    type DataPoint = {
        ensembleIdx: number;
        fipNumber: number;
        values: number[][];
        timestamps: number[];
        realizations: number[];
    };

    const dataPoints: DataPoint[] = [];
    for (let eIdx = 0; eIdx < aggregatedData.length; eIdx++) {
        const d = aggregatedData[eIdx];
        for (const fip of selectedRegions) {
            const vals = d.perRegionValues.get(fip);
            if (vals) {
                dataPoints.push({
                    ensembleIdx: eIdx,
                    fipNumber: fip,
                    values: vals,
                    timestamps: d.timestamps,
                    realizations: d.realizations,
                });
            }
        }
    }

    if (dataPoints.length === 0) return [];

    // Group by (subplotKey, colorKey)
    // For subplotBy=null, all data points get subplotKey="_all"
    type GroupedEntry = {
        valuesArrays: number[][][];
        timestamps: number[];
        realizations: number[];
        ensembleIdentString: string;
    };
    const grouped = new Map<string, Map<string, GroupedEntry>>();
    // Track insertion order for stable iteration
    const subplotKeyOrder: string[] = [];
    const colorKeyOrderPerSubplot = new Map<string, string[]>();

    for (const dp of dataPoints) {
        const subplotKey = subplotBy
            ? getDimensionKey(subplotBy, dp.ensembleIdx, ensembleIdents, dp.fipNumber, fipRegionLabels)
            : "_all";
        const colorKey = getDimensionKey(colorBy, dp.ensembleIdx, ensembleIdents, dp.fipNumber, fipRegionLabels);

        if (!grouped.has(subplotKey)) {
            grouped.set(subplotKey, new Map());
            subplotKeyOrder.push(subplotKey);
            colorKeyOrderPerSubplot.set(subplotKey, []);
        }
        const subplotMap = grouped.get(subplotKey)!;
        if (!subplotMap.has(colorKey)) {
            subplotMap.set(colorKey, {
                valuesArrays: [],
                timestamps: dp.timestamps,
                realizations: dp.realizations,
                ensembleIdentString: ensembleIdents[dp.ensembleIdx].toString(),
            });
            colorKeyOrderPerSubplot.get(subplotKey)!.push(colorKey);
        }
        subplotMap.get(colorKey)!.valuesArrays.push(dp.values);
    }

    // Build SubplotGroups
    const groups: SubplotGroup[] = [];

    for (const subplotKey of subplotKeyOrder) {
        const subplotMap = grouped.get(subplotKey)!;
        const colorKeyOrder = colorKeyOrderPerSubplot.get(subplotKey)!;
        const traces: ChartTrace[] = [];

        // Get a stable color index for each color key
        // Build a global list of all unique color keys for consistent coloring
        const allColorKeys = new Set<string>();
        for (const keys of colorKeyOrderPerSubplot.values()) {
            for (const k of keys) allColorKeys.add(k);
        }
        const globalColorKeys = [...allColorKeys];

        for (const colorKey of colorKeyOrder) {
            const entry = subplotMap.get(colorKey)!;
            const summed = sumValuesArrays(entry.valuesArrays);
            const stats = summed ? computeStatistics(summed) : null;

            const colorIdx = globalColorKeys.indexOf(colorKey);
            const ensembleColor = colorBy === PlotDimension.Ensemble ? ensembleColorMap.get(colorKey) : undefined;

            traces.push({
                label: getDimensionLabel(colorBy, colorKey),
                color: ensembleColor ?? DIMENSION_COLORS[colorIdx % DIMENSION_COLORS.length],
                timestamps: entry.timestamps,
                stats,
                realizations: entry.realizations,
                aggregatedValues: summed,
                ensembleIdentString: entry.ensembleIdentString,
            });
        }

        const title = subplotBy && subplotKey !== "_all" ? getDimensionLabel(subplotBy, subplotKey) : "";
        groups.push({ title, traces });
    }

    return groups;
});

// ────────── Color palettes ──────────

const DIMENSION_COLORS = [
    "#1976d2",
    "#e53935",
    "#43a047",
    "#fb8c00",
    "#8e24aa",
    "#00897b",
    "#d81b60",
    "#5e35b1",
    "#00acc1",
    "#7cb342",
];
