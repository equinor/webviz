import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import type { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumes/queryHooks";
import { useGetAggregatedStatisticalTableDataQueries } from "@modules/_shared/InplaceVolumes/queryHooks";

import {
    areSelectedTablesComparableAtom,
    comparisonEnsembleIdentAtom,
    indicesWithValuesAtom,
    isEnsemblePairValidAtom,
    referenceEnsembleIdentAtom,
    subplotByAtom,
    tableNameAtom,
    waterfallFactorSpecAtom,
} from "./baseAtoms";

export const isWaterfallComputableAtom = atom((get) => {
    return (
        get(isEnsemblePairValidAtom) &&
        get(areSelectedTablesComparableAtom) &&
        get(waterfallFactorSpecAtom) !== null &&
        get(tableNameAtom) !== null
    );
});

/**
 * Statistical (mean) inplace volumes data for the reference and comparison ensembles, for the result
 * names required by the decomposition.
 */
export const waterfallStatisticalDataQueriesAtom = atomWithQueries((get) => {
    const referenceEnsembleIdent = get(referenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = get(comparisonEnsembleIdentAtom);
    const tableName = get(tableNameAtom);
    const factorSpec = get(waterfallFactorSpecAtom);
    const subplotBy = get(subplotByAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const isEnabled = get(isWaterfallComputableAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of [referenceEnsembleIdent, comparisonEnsembleIdent]) {
        if (ensembleIdent) {
            ensembleIdentsWithRealizations.push({
                ensembleIdent,
                realizations: [...validEnsembleRealizationsFunction(ensembleIdent)],
            });
        }
    }

    // Group by FLUID so the backend keeps the fluid-specific FVF (BO for oil, BG for gas); without it
    // fluids are summed and BO/BG are dropped. A selected "Subplot by" index is added to produce one
    // waterfall per value (e.g. per REGION).
    const groupByIndices = subplotBy ? ["FLUID", subplotBy] : ["FLUID"];

    return useGetAggregatedStatisticalTableDataQueries(
        ensembleIdentsWithRealizations,
        tableName ? [tableName] : [],
        factorSpec?.requiredResultNames ?? [],
        groupByIndices,
        indicesWithValues,
        isEnabled,
    );
});
