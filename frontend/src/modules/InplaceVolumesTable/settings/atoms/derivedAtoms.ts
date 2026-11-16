import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { getSelectionForOfferedIndexColumns } from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import type {
    SensitivityCaseIdent,
    SensitivityMode,
    SensitivitySelection,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { getSensitivityCaseIdents, resolveSensitivityMode } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import { selectedIndexValueCriteriaAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedSensitivityCasesAtom,
    selectedTableNamesAtom,
} from "./persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const sensitivityModeAtom = atom<SensitivityMode>((get) => {
    return resolveSensitivityMode(get(EnsembleSetAtom), get(selectedEnsembleIdentsAtom).value);
});

export const availableSensitivityCasesAtom = atom<SensitivityCaseIdent[]>((get) => {
    const sensitivityMode = get(sensitivityModeAtom);
    return sensitivityMode.kind === "active" ? getSensitivityCaseIdents(sensitivityMode.sensitivities) : [];
});

export const isSensitivityEnsembleSelectionBlockedAtom = atom<boolean>((get) => {
    return get(sensitivityModeAtom).kind === "blocked";
});

export const sensitivitySelectionAtom = atom<SensitivitySelection | null>((get) => {
    const sensitivityMode = get(sensitivityModeAtom);
    if (sensitivityMode.kind !== "active") {
        return null;
    }
    return {
        ensembleIdent: sensitivityMode.ensemble.getIdent(),
        selectedCases: get(selectedSensitivityCasesAtom).value,
    };
});

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

    if (get(isSensitivityEnsembleSelectionBlockedAtom)) {
        return false;
    }

    if (get(sensitivityModeAtom).kind === "active" && !get(selectedSensitivityCasesAtom).isValidInContext) {
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
