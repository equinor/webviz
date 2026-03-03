import { atom } from "jotai";

import type { VectorRealizationsData_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { ColorBy } from "../../typesAndEnums";
import type { TimeseriesStatistics } from "../../typesAndEnums";
import { computeRecoveryFactor, computeStatistics, sumAcrossVectors } from "../../utils/aggregation";
import { parseRegionalVector } from "../../utils/regionalVectors";

import {
    colorByAtom,
    ensembleIdentsAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
    showRecoveryFactorAtom,
} from "./baseAtoms";
import { realizationVectorDataQueriesAtom } from "./queryAtoms";

// ────────── Helpers ──────────

/** Check if a base vector name is an in-place volume (ROIP, RGIP, RWIP, etc.) */
export function isInPlaceVector(baseName: string | null): boolean {
    if (!baseName) return false;
    return /^R[OGW]IP/.test(baseName);
}

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
};

/**
 * Build chart traces based on the colorBy mode.
 *
 * - ColorBy.Ensemble: one trace per ensemble (regions summed),
 *   colored by ensemble color from the workbench palette.
 * - ColorBy.Region: one trace per (ensemble × region),
 *   colored by region number.
 */
export const chartTracesAtom = atom<ChartTrace[]>((get) => {
    const aggregatedData = get(aggregatedEnsembleDataArrayAtom);
    const colorBy = get(colorByAtom);
    const selectedRegions = get(selectedRegionsAtom);

    const traces: ChartTrace[] = [];

    if (colorBy === ColorBy.Ensemble) {
        // One trace per ensemble — sum across regions
        for (let i = 0; i < aggregatedData.length; i++) {
            const d = aggregatedData[i];
            traces.push({
                label: d.ensembleIdent.getEnsembleName(),
                color: ENSEMBLE_COLORS[i % ENSEMBLE_COLORS.length],
                timestamps: d.timestamps,
                stats: d.stats,
                realizations: d.realizations,
                aggregatedValues: d.aggregatedValues,
            });
        }
    } else {
        // ColorBy.Region — one trace per region (within each ensemble)
        for (const d of aggregatedData) {
            const ensembleSuffix = aggregatedData.length > 1 ? ` (${d.ensembleIdent.getEnsembleName()})` : "";
            for (const region of selectedRegions) {
                const regionVals = d.perRegionValues.get(region);
                const regionStats = d.perRegionStats.get(region);
                if (regionVals) {
                    const regionIdx = selectedRegions.indexOf(region);
                    traces.push({
                        label: `Region ${region}${ensembleSuffix}`,
                        color: REGION_COLORS[regionIdx % REGION_COLORS.length],
                        timestamps: d.timestamps,
                        stats: regionStats ?? null,
                        realizations: d.realizations,
                        aggregatedValues: regionVals,
                    });
                }
            }
        }
    }

    return traces;
});

// ────────── Color palettes ──────────

const ENSEMBLE_COLORS = [
    "#1976d2",
    "#e53935",
    "#43a047",
    "#fb8c00",
    "#8e24aa",
    "#00897b",
    "#d81b60",
    "#5e35b1",
];

const REGION_COLORS = [
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
