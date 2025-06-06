import { atom } from "jotai";

import { InplaceVolumesIndex_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumes/queryHooks";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { accumulationOptionsAtom, filterAtom, tableTypeAtom } from "./baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "./queryAtoms";

export const tableNamesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.tableNames ?? [];
});

export const fluidsAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.fluids ?? [];
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

export const accumulateFluidsAtom = atom((get) => {
    const accumulationOptions = get(accumulationOptionsAtom);

    return !accumulationOptions.includes(InplaceVolumesIndex_api.FLUID);
});

export const groupByIndicesAtom = atom((get) => {
    const accumulationOptions = get(accumulationOptionsAtom);

    return accumulationOptions.filter((el) => el !== InplaceVolumesIndex_api.FLUID) as InplaceVolumesIndex_api[];
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
