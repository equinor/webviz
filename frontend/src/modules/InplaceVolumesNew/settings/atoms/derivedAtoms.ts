import { atom } from "jotai";

import { getSelectionForOfferedIndexColumns } from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import { selectedIndexValueCriteriaAtom, selectedPlotTypeAtom } from "./baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedResultNameAtom,
    selectedIndicesWithValuesAtom,
    selectedSelectorColumnAtom,
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
    const selectedResultName = get(selectedResultNameAtom);

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

    if (!selectedResultName.value || !tableDefinitionsAccessor.hasResultName(selectedResultName.value)) {
        return false;
    }

    // The atom's own validity, which also requires every offered index column to be covered - entries for columns
    // that are not offered are ignored, as nothing could repair them
    if (!get(selectedIndicesWithValuesAtom).isValidInContext) {
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

    // The selector column is only used (and its control only shown) for bar plots
    if (get(selectedPlotTypeAtom) === PlotType.BAR && !get(selectedSelectorColumnAtom).isValidInContext) {
        return false;
    }

    return true;
});

export const areSelectedTablesComparableAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    return tableDefinitionsAccessor.getAreTablesComparable();
});
