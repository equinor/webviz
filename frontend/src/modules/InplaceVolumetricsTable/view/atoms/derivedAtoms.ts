import { InplaceVolumetricsIdentifier_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { SourceIdentifier, TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

import { accumulationOptionsAtom, filterAtom, tableTypeAtom } from "./baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "./queryAtoms";

export const tableNamesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.tableNames ?? [];
});

export const fluidZonesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.fluidZones ?? [];
});

export const identifiersValuesAtom = atom((get) => {
    const filter = get(filterAtom);
    return filter?.identifiersValues ?? [];
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

export const accumulateFluidZonesAtom = atom((get) => {
    const accumulationOptions = get(accumulationOptionsAtom);

    return !accumulationOptions.includes(SourceIdentifier.FLUID_ZONE);
});

export const groupByIdentifiersAtom = atom((get) => {
    const accumulationOptions = get(accumulationOptionsAtom);

    return accumulationOptions.filter((el) => el !== SourceIdentifier.FLUID_ZONE) as InplaceVolumetricsIdentifier_api[];
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

export const hasAllQueriesFailedAtom = atom((get) => {
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
