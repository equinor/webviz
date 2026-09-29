import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type {
    SensitivityCaseRef,
    SensitivityMode,
    SensitivitySelection,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { getSensitivityCaseRefs, resolveSensitivityMode } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import { selectedIndexValueCriteriaAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedSensitivityCasesAtom,
    selectedTableNamesAtom,
} from "./persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const sensitivityModeAtom = atom<SensitivityMode>((get) => {
    return resolveSensitivityMode(get(EnsembleSetAtom), get(selectedEnsembleIdentsAtom).value);
});

export const availableSensitivityCasesAtom = atom<SensitivityCaseRef[]>((get) => {
    const sensitivityMode = get(sensitivityModeAtom);
    return sensitivityMode.kind === "active" ? getSensitivityCaseRefs(sensitivityMode.sensitivities) : [];
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

export const areTableDefinitionSelectionsValidAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedResultNames = get(selectedResultNamesAtom);
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom);

    const tableDefinitionsQuery = get(tableDefinitionsQueryAtom);

    if (tableDefinitionsQuery.isLoading) {
        return false;
    }

    if (get(isSensitivityEnsembleSelectionBlockedAtom)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasEnsembleIdents(selectedEnsembleIdents.value)) {
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

    if (!tableDefinitionsAccessor.hasIndicesWithValues(selectedIndicesWithValues.value)) {
        return false;
    }

    return true;
});

export const areSelectedTablesComparableAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    return tableDefinitionsAccessor.getAreTablesComparable();
});
