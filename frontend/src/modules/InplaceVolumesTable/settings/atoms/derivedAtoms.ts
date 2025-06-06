import { atom } from "jotai";

import type { InplaceVolumesFluid_api, InplaceVolumesIndex_api, InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIndexValues } from "@modules/_shared/InplaceVolumes/fixupUserSelectedIndexValues";
import {
    TableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedAccumulationOptionsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidsAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedResultNamesAtom,
    userSelectedTableNamesAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    if (!userSelectedEnsembleIdents) {
        if (ensembleSet.getRegularEnsembleArray().length === 0) {
            return [];
        }
        return [ensembleSet.getRegularEnsembleArray()[0].getIdent()];
    }

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble),
    );

    const validatedEnsembleIdents = fixupRegularEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const tableDefinitionsAccessorAtom = atom<TableDefinitionsAccessor>((get) => {
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    return new TableDefinitionsAccessor(
        tableDefinitions.isLoading ? [] : tableDefinitions.data,
        selectedTableNames,
        selectedIndexValueCriteria,
    );
});

export const areTableDefinitionSelectionsValidAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedFluids = get(selectedFluidsAtom);
    const selectedResultNames = get(selectedResultNamesAtom);
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom);

    const tableDefinitionsQuery = get(tableDefinitionsQueryAtom);

    if (tableDefinitionsQuery.isLoading) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasEnsembleIdents(selectedEnsembleIdents)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasTableNames(selectedTableNames)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasFluids(selectedFluids)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasResultNames(selectedResultNames)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasIndicesWithValues(selectedIndicesWithValues)) {
        return false;
    }

    return true;
});

export const areSelectedTablesComparableAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    return tableDefinitionsAccessor.getAreTablesComparable();
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

export const selectedFluidsAtom = atom<InplaceVolumesFluid_api[]>((get) => {
    const userSelectedFluids = get(userSelectedFluidsAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedFluids) {
        return tableDefinitionsAccessor.getFluidsIntersection();
    }

    return fixupUserSelection(
        userSelectedFluids,
        tableDefinitionsAccessor.getFluidsIntersection(),
        FixupSelection.SELECT_ALL,
    );
});

export const selectedResultNamesAtom = atom<string[]>((get) => {
    const userSelectedResultNames = get(userSelectedResultNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const fixedSelection = fixupUserSelection(
        userSelectedResultNames,
        tableDefinitionsAccessor.getResultNamesIntersection(),
    );

    return fixedSelection;
});

export const selectedAccumulationOptionsAtom = atom<InplaceVolumesIndex_api[]>((get) => {
    const userSelectedAccumulation = get(userSelectedAccumulationOptionsAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const availableUniqueAccumulationOptions: InplaceVolumesIndex_api[] = [];
    for (const indicesWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        availableUniqueAccumulationOptions.push(indicesWithValues.indexColumn);
    }

    if (!userSelectedAccumulation || userSelectedAccumulation.length === 0) {
        return [];
    }

    return fixupUserSelection(userSelectedAccumulation, availableUniqueAccumulationOptions, FixupSelection.SELECT_NONE);
});

export const selectedIndicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[]>((get) => {
    const userSelectedIndicesWithValues = get(userSelectedIndicesWithValuesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const uniqueIndicesWithValues = tableDefinitionsAccessor.getCommonIndicesWithValues();

    const fixedUpIndicesWithValues: InplaceVolumesIndexWithValues_api[] = fixupUserSelectedIndexValues(
        userSelectedIndicesWithValues,
        uniqueIndicesWithValues,
        FixupSelection.SELECT_ALL,
    );

    return fixedUpIndicesWithValues;
});
