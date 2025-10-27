import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIndexValues } from "@modules/_shared/InplaceVolumes/fixupUserSelectedIndexValues";
import {
    TableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import { makeColorByOptions, makeSubplotByOptions } from "../utils/plotDimensionUtils";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedSecondResultNameAtom,
    userSelectedFirstResultNameAtom,
    userSelectedSelectorColumnAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
    userSelectedPlotTypeAtom,
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
    const selectedFirstResultName = get(selectedFirstResultNameAtom);
    const selectedSecondResultName = get(selectedSecondResultNameAtom);
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

    if (!selectedFirstResultName || !tableDefinitionsAccessor.hasResultName(selectedFirstResultName)) {
        return false;
    }

    if (selectedSecondResultName && !tableDefinitionsAccessor.hasResultName(selectedSecondResultName)) {
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
        return uniqueTableNames.length > 0 ? [uniqueTableNames[0]] : [];
    }

    return fixupUserSelection(userSelectedTableNames, uniqueTableNames);
});

export const selectedFirstResultNameAtom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedFirstResultNameAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedResultName) {
        if (tableDefinitionsAccessor.getResultNamesIntersection().length === 0) {
            return null;
        }
        return tableDefinitionsAccessor.getResultNamesIntersection()[0];
    }

    const fixedSelection = fixupUserSelection(
        [userSelectedResultName],
        tableDefinitionsAccessor.getResultNamesIntersection(),
    );
    if (fixedSelection.length === 0) {
        return null;
    }

    return fixedSelection[0];
});

export const selectedSecondResultNameAtom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedSecondResultNameAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedResultName) {
        if (tableDefinitionsAccessor.getResultNamesIntersection().length === 0) {
            return null;
        }
        return tableDefinitionsAccessor.getResultNamesIntersection()[0];
    }

    const fixedSelection = fixupUserSelection(
        [userSelectedResultName],
        tableDefinitionsAccessor.getResultNamesIntersection(),
    );
    if (fixedSelection.length === 0) {
        return null;
    }

    return fixedSelection[0];
});

export const selectedSelectorColumnAtom = atom<string | null>((get) => {
    const plotType = get(userSelectedPlotTypeAtom);

    // Only return a selector column for BAR plots
    if (plotType !== PlotType.BAR) {
        return null;
    }
    const userSelectedSelectorColumn = get(userSelectedSelectorColumnAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const possibleSelectorColumns = tableDefinitionsAccessor.getCommonSelectorColumns();
    if (!userSelectedSelectorColumn) {
        return possibleSelectorColumns[0] ?? null;
    }

    const fixedSelection = fixupUserSelection([userSelectedSelectorColumn], possibleSelectorColumns);
    if (fixedSelection.length === 0) {
        return null;
    }

    return fixedSelection[0];
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

export const selectedSubplotByAtom = atom<string>((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    // If multiple ensembles AND multiple table names, subplot MUST be one of them
    if (numEnsembleIdents > 1 && numTableNames > 1) {
        // Force to ENSEMBLE if current selection is invalid
        if (userSelectedSubplotBy !== TableOriginKey.ENSEMBLE && userSelectedSubplotBy !== TableOriginKey.TABLE_NAME) {
            return TableOriginKey.ENSEMBLE;
        }
        // Keep valid selection
        return userSelectedSubplotBy;
    }
    const validOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames).map((el) => el.value);
    const fixedSelection = fixupUserSelection([userSelectedSubplotBy], validOptions);

    return fixedSelection[0];
});

export const selectedColorByAtom = atom<string>((get) => {
    const userSelectedColorBy = get(userSelectedColorByAtom);
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedSubplotBy = get(selectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    // If multiple ensembles AND multiple table names, colorBy MUST be the other one
    if (numEnsembleIdents > 1 && numTableNames > 1) {
        if (selectedSubplotBy === TableOriginKey.ENSEMBLE) {
            return TableOriginKey.TABLE_NAME;
        }
        return TableOriginKey.ENSEMBLE;
    }
    const validOptions = makeColorByOptions(tableDefinitionsAccessor, userSelectedSubplotBy, selectedTableNames).map(
        (el) => el.value,
    );
    const fixedSelection = fixupUserSelection([userSelectedColorBy], validOptions);

    return fixedSelection[0];
});
