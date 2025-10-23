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
export const areSensitivitiesComparableAtom = atom<boolean>((get) => {
    const hasSensitivities = get(hasSensitivitiesAtom);
    if (!hasSensitivities) {
        return true;
    }

    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const ensembleSet = get(EnsembleSetAtom);

    if (selectedEnsembleIdents.length === 0) {
        return true;
    }

    let referenceSensitivities: [string, string[]][] | null = null;

    for (const ensIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensIdent);
        const sensitivities = ensemble?.getSensitivities();

        if (!ensemble || !sensitivities) {
            return false;
        }

        const sensitivityNames = sensitivities.getSensitivityNames();

        if (referenceSensitivities === null) {
            referenceSensitivities = sensitivityNames.map((sensName) => {
                return [sensName, sensitivities.getCaseNamesForSensitivity(sensName).toSorted()];
            });
        } else {
            if (
                referenceSensitivities.length !== sensitivityNames.length ||
                !referenceSensitivities.every((sens, index) => sens[0] === sensitivityNames[index])
            ) {
                return false;
            }
        }
    }

    return true;
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
export const hasSensitivitiesAtom = atom<boolean>((get) => {
    //Checks if any ensembles has more than one sensitivity
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const ensembleSet = get(EnsembleSetAtom);
    for (const ensIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensIdent);
        const sensitivities = ensemble?.getSensitivities();
        if (ensemble && sensitivities && sensitivities.getSensitivityArr().length > 1) {
            return true;
        }
    }
    return false;
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
        return uniqueTableNames;
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
export const validSelectedSubplotByAndColorByAtom = atom<{ subplotBy: string[]; colorBy: string }>((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const userSelectedColorBy = get(userSelectedColorByAtom);

    const validSubplotBy = [...userSelectedSubplotBy];
    let validColorBy = userSelectedColorBy;

    if (!userSelectedSubplotBy.includes("TABLE_NAME") && userSelectedColorBy !== "TABLE_NAME") {
        validSubplotBy.unshift("TABLE_NAME");
    }
    if (!userSelectedSubplotBy.includes("ENSEMBLE") && userSelectedColorBy !== "ENSEMBLE") {
        validSubplotBy.unshift("ENSEMBLE");
        if (userSelectedColorBy !== "TABLE_NAME") {
            validColorBy = "ENSEMBLE";
        }
    }
    return { subplotBy: validSubplotBy, colorBy: validColorBy };
});

export const selectedSubplotByAtom = atom<string[]>((get) => {
    const { subplotBy } = get(validSelectedSubplotByAndColorByAtom);
    return subplotBy;
});

export const selectedColorByAtom = atom<string>((get) => {
    const { colorBy } = get(validSelectedSubplotByAndColorByAtom);
    return colorBy;
});
