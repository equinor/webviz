import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import type { InplaceVolumesSource } from "@modules/_shared/InplaceVolumes/queryHooks";
import { makeAggregatedStatisticalTableDataQueryOptions } from "@modules/_shared/InplaceVolumes/queryHooks";

import { FLUID_INDEX_COLUMN } from "../utils/computeVolumeChangeDecomposition";
import type { WaterfallSource } from "../utils/waterfallSources";

import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    comparisonEnsembleIdentAtom,
    comparisonTableNameAtom,
    indicesWithValuesAtom,
    referenceEnsembleIdentAtom,
    referenceTableNameAtom,
    subplotByAtom,
    waterfallFactorSpecAtom,
} from "./baseAtoms";

/** The reference and comparison sources, or null when either is incompletely selected. */
export const waterfallSourcesAtom = atom<{ reference: WaterfallSource; comparison: WaterfallSource } | null>((get) => {
    const referenceEnsembleIdent = get(referenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = get(comparisonEnsembleIdentAtom);
    const referenceTableName = get(referenceTableNameAtom);
    const comparisonTableName = get(comparisonTableNameAtom);

    if (!referenceEnsembleIdent || !comparisonEnsembleIdent || !referenceTableName || !comparisonTableName) {
        return null;
    }

    return {
        reference: { ensembleIdent: referenceEnsembleIdent, tableName: referenceTableName },
        comparison: { ensembleIdent: comparisonEnsembleIdent, tableName: comparisonTableName },
    };
});

export const isWaterfallComputableAtom = atom((get) => {
    return (
        get(areSourcesDistinctAtom) &&
        get(areSelectedTablesComparableAtom) &&
        get(waterfallFactorSpecAtom) !== null &&
        get(waterfallSourcesAtom) !== null
    );
});

/**
 * Statistical (mean and percentile) inplace volumes data for the reference and comparison sources,
 * for the result names required by the decomposition.
 */
export const waterfallStatisticalDataQueriesAtom = atomWithQueries((get) => {
    const waterfallSources = get(waterfallSourcesAtom);
    const factorSpec = get(waterfallFactorSpecAtom);
    const subplotBy = get(subplotByAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const isEnabled = get(isWaterfallComputableAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const sources: InplaceVolumesSource[] = waterfallSources
        ? [waterfallSources.reference, waterfallSources.comparison].map((source) => ({
              ensembleIdent: source.ensembleIdent,
              tableName: source.tableName,
              realizations: [...validEnsembleRealizationsFunction(source.ensembleIdent)],
          }))
        : [];

    // Group by FLUID so the volumes belong to a single fluid zone. Summing fluids would mix the oil
    // and gas pore volumes, and HCPV/PORV and HCPV/STOIIP would no longer be that zone's saturation
    // and FVF. A selected "Subplot by" index is added to produce one waterfall per value.
    const groupByIndices = subplotBy ? [FLUID_INDEX_COLUMN, subplotBy] : [FLUID_INDEX_COLUMN];

    return makeAggregatedStatisticalTableDataQueryOptions(
        sources,
        factorSpec?.requiredResultNames ?? [],
        groupByIndices,
        indicesWithValues,
        isEnabled,
    );
});
