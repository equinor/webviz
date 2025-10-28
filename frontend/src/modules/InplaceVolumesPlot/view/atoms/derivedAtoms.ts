import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumes/queryHooks";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";

import { colorByAtom, filterAtom, selectorColumnAtom, subplotByAtom } from "./baseAtoms";
import { aggregatedTableDataQueriesAtom } from "./queryAtoms";

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

export const groupByIndicesAtom = atom((get) => {
    const subplotBy = get(subplotByAtom);
    const colorBy = get(colorByAtom);
    const selectorColumn = get(selectorColumnAtom);
    const indicesWithValues = get(indicesWithValuesAtom);

    const validIndexColumns = indicesWithValues.map((indexWithValue) => indexWithValue.indexColumn);

    const groupByIndices: string[] = [];
    if (validIndexColumns.includes(subplotBy as any)) {
        groupByIndices.push(subplotBy);
    }
    if (validIndexColumns.includes(colorBy as any)) {
        groupByIndices.push(colorBy);
    }
    if (
        selectorColumn !== null &&
        validIndexColumns.includes(selectorColumn) &&
        !groupByIndices.includes(selectorColumn)
    ) {
        groupByIndices.push(selectorColumn);
    }
    return groupByIndices;
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
export const inplaceTableAtom = atom((get) => {
    const aggregatedTableDataQueries = get(aggregatedTableDataQueriesAtom);
    return makeTableFromApiData(aggregatedTableDataQueries.tablesData);
});
