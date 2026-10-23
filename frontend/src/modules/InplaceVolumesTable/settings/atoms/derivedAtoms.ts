import { atom } from "jotai";

import { getSelectionForOfferedIndexColumns } from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import { selectedIndexValueCriteriaAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const tableDefinitionsAccessorAtom = atom<TableDefinitionsAccessor>((get) => {
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    return new TableDefinitionsAccessor(
        tableDefinitions.isLoading ? [] : tableDefinitions.data,
        selectedTableNames.value,
        selectedIndexValueCriteria,
    );
});

// The index-value selection without entries for columns that are not offered - what is validated against and queried
export const offeredSelectedIndicesWithValuesAtom = atom((get) => {
    return getSelectionForOfferedIndexColumns(
        get(selectedIndicesWithValuesAtom).value,
        get(tableDefinitionsAccessorAtom).getCommonIndicesWithValues(),
    );
});

export const areTableDefinitionSelectionsValidAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedResultNames = get(selectedResultNamesAtom);

    const tableDefinitionsQuery = get(tableDefinitionsQueryAtom);

    if (tableDefinitionsQuery.isLoading) {
        return false;
    }

    // Disabled definition queries keep their cached results, so the accessor can still have the ensembles of a
    // selection that is no longer valid (e.g. after one of them was removed from the session)
    if (
        !selectedEnsembleIdents.isValidInContext ||
        !tableDefinitionsAccessor.hasEnsembleIdents(selectedEnsembleIdents.value)
    ) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasTableNames(selectedTableNames.value)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasResultNames(selectedResultNames.value)) {
        return false;
    }

    // Persisted/template selections are passed through unfixed, so they may still hold results that
    // are invalid in the current context (e.g. BO/BG without FLUID grouping)
    if (!selectedResultNames.isValidInContext) {
        return false;
    }

    // Likewise, a retained grouping may hold index columns the current tables don't have (e.g. REGION)
    if (!get(selectedGroupByIndicesAtom).isValidInContext) {
        return false;
    }

    // The atom's own validity - entries for columns that are not offered are ignored, as nothing could repair them
    if (!get(selectedIndicesWithValuesAtom).isValidInContext) {
        return false;
    }

    return true;
});

export const areSelectedTablesComparableAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    return tableDefinitionsAccessor.getAreTablesComparable();
});
