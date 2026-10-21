import { atom } from "jotai";

import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import { selectedIndexValueCriteriaAtom } from "./baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFirstResultNameAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedSubplotByAtom,
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

export const areTableDefinitionSelectionsValidAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedFirstResultName = get(selectedFirstResultNameAtom);
    const selectedSecondResultName = get(selectedSecondResultNameAtom);
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom);

    const tableDefinitionsQuery = get(tableDefinitionsQueryAtom);

    if (tableDefinitionsQuery.isLoading) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasEnsembleIdents(selectedEnsembleIdents.value)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasTableNames(selectedTableNames.value)) {
        return false;
    }

    if (!selectedFirstResultName.value || !tableDefinitionsAccessor.hasResultName(selectedFirstResultName.value)) {
        return false;
    }

    if (selectedSecondResultName.value && !tableDefinitionsAccessor.hasResultName(selectedSecondResultName.value)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasIndicesWithValues(selectedIndicesWithValues.value)) {
        return false;
    }

    // A retained subplot column may be missing from the current tables (e.g. REGION), and would then
    // be neither fetched as a group-by column nor found by the plot builder
    if (!get(selectedSubplotByAtom).isValidInContext) {
        return false;
    }

    // Likewise for the color-by column, which the plot data builder requires to exist in the table
    if (!get(selectedColorByAtom).isValidInContext) {
        return false;
    }

    return true;
});

export const areSelectedTablesComparableAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    return tableDefinitionsAccessor.getAreTablesComparable();
});
