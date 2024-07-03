import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIndexFilterValuesAtom,
    userSelectedResultNameAtom,
    userSelectedTableNamesAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

import {
    InplaceVolumetricsTableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "../utils/inplaceVolumetricsTableDefinitionsAccessor";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    if (!userSelectedEnsembleIdents) {
        if (ensembleSet.getEnsembleArr().length === 0) {
            return [];
        }
        return [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble)
    );

    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const tableDefinitionsAccessorAtom = atom<InplaceVolumetricsTableDefinitionsAccessor>((get) => {
    const selectedTableSources = get(selectedTableNamesAtom);
    const tableDefinitions = get(tableDefinitionsQueryAtom);

    return new InplaceVolumetricsTableDefinitionsAccessor(
        tableDefinitions.isLoading ? [] : tableDefinitions.data,
        selectedTableSources
    );
});

export const selectedTableNamesAtom = atom<string[]>((get) => {
    const userSelectedTableNames = get(userSelectedTableNamesAtom);
    const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);

    const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);

    if (!userSelectedTableNames) {
        return uniqueTableNames;
    }

    return fixupUserSelection(userSelectedTableNames, uniqueTableNames);
});

export const selectedFluidZonesAtom = atom<string[]>((get) => {
    const userSelectedFluidZones = get(userSelectedFluidZonesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedFluidZones) {
        return tableDefinitionsAccessor.getUniqueFluidZones();
    }

    return fixupUserSelection(userSelectedFluidZones, tableDefinitionsAccessor.getUniqueFluidZones());
});

export const selectedResultNameAtom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedResultNameAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedResultName) {
        if (tableDefinitionsAccessor.getUniqueResultNames().length === 0) {
            return null;
        }
        return tableDefinitionsAccessor.getUniqueResultNames()[0];
    }

    const fixedSelection = fixupUserSelection(
        [userSelectedResultName],
        tableDefinitionsAccessor.getUniqueResultNames()
    );
    if (fixedSelection.length === 0) {
        return null;
    }

    return fixedSelection[0];
});

export const selectedIndexFilterValuesAtom = atom<Record<string, string[]>>((get) => {
    const userSelectedIndexFilterValues = get(userSelectedIndexFilterValuesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedIndexFilterValues) {
        const uniqueIndexFilterValues = tableDefinitionsAccessor.getUniqueIndexFilterValues();
        const fixedIndexFilterValues: Record<string, string[]> = {};
        for (const [indexFilter, values] of Object.entries(uniqueIndexFilterValues)) {
            fixedIndexFilterValues[indexFilter] = fixupUserSelection(values, values).map((value) => value.toString());
        }
        return fixedIndexFilterValues;
    }

    const fixedIndexFilterValues: Record<string, string[]> = {};
    for (const [indexFilter, values] of Object.entries(userSelectedIndexFilterValues)) {
        fixedIndexFilterValues[indexFilter] = fixupUserSelection(
            values,
            tableDefinitionsAccessor.getUniqueIndexFilterValues()[indexFilter]
        ).map((value) => value.toString());
    }

    return fixedIndexFilterValues;
});

function fixupUserSelection<TSelection>(userSelection: TSelection[], validOptions: TSelection[]): TSelection[] {
    const newSelections = userSelection.filter((selection) => validOptions.includes(selection));
    if (newSelections.length === 0 && validOptions.length > 0) {
        newSelections.push(validOptions[0]);
    }

    return newSelections;
}
