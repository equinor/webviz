import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumes/queryHooks";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { filterAtom, tableTypeAtom } from "./baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "./queryAtoms";

export const tableNamesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.tableNames ?? [];
});

export const indicesWithValuesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.indicesWithValues ?? [];
});

export const areSelectedTablesComparableAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.areSelectedTablesComparable ?? false;
});

export const ensembleIdentsWithRealizationsAtom = atom((get) => {
    const filter = get(filterAtom);
    const ensemblIdents = filter?.ensembleIdents ?? [];
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of ensemblIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: [...validEnsembleRealizationsFunction(ensembleIdent)],
        });
    }

    return ensembleIdentsWithRealizations;
});

export const activeQueriesResultAtom = atom((get) => {
    // Active queries result atom based on selected table type
    const tableType = get(tableTypeAtom);
    if (tableType === TableType.PER_REALIZATION) {
        return get(perRealizationTableDataResultsAtom);
    }
    if (tableType === TableType.STATISTICAL) {
        return get(statisticalTableDataResultsAtom);
    }
    throw new Error(`Unsupported table type: ${tableType}`);
});

export const isQueryFetchingAtom = atom((get) => {
    const activeQueriesResult = get(activeQueriesResultAtom);
    return activeQueriesResult.isFetching;
});

export const haveAllQueriesFailedAtom = atom((get) => {
    const tableType = get(tableTypeAtom);
    const perRealizationTableDataResults = get(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = get(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        return perRealizationTableDataResults.allQueriesFailed;
    }
    if (tableType === TableType.STATISTICAL) {
        return statisticalTableDataResults.allQueriesFailed;
    }
    return false;
});
