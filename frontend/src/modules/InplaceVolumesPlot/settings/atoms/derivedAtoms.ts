import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
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
    userSelectedIndicesWithValuesAtom,
    userSelectedSecondResultNameAtom,
    userSelectedFirstResultNameAtom,
    userSelectedSelectorColumnAtom,
    userSelectedSubplotByAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const persistedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return value !== null && value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupRegularEnsembleIdents(value, ensembleSet) ?? [];
    },
});
// export const persistedTableNamesAtom = atom<string[]>((get) => {
//     const userSelectedTableNames = get(userSelectedTableNamesAtom);
//     const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);

//     const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);

//     if (!userSelectedTableNames) {
//         return uniqueTableNames;
//     }

//     return fixupUserSelection(userSelectedTableNames, uniqueTableNames);
// });

export const persistedTableNamesAtom = persistableFixableAtom<string[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);
        const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);
        return value !== null && value.every((name) => uniqueTableNames.includes(name));
    },
    fixupFunction: ({ value, get }) => {
        const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);
        const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);
        return fixupUserSelection(value, uniqueTableNames) ?? [];
    },
});

export const tableDefinitionsAccessorAtom = atom<TableDefinitionsAccessor>((get) => {
    const selectedTableNames = get(persistedTableNamesAtom);
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
    const selectedEnsembleIdents = get(persistedEnsembleIdentsAtom);
    const selectedTableNames = get(persistedTableNamesAtom);
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

export const selectedSubplotByAtom = atom<string>((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(persistedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value).map((el) => el.value);
    const fixedSelection = fixupUserSelection([userSelectedSubplotBy], validOptions);

    return fixedSelection[0];
});

export const selectedColorByAtom = atom<string>((get) => {
    const userSelectedColorBy = get(userSelectedColorByAtom);
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(persistedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        userSelectedSubplotBy,
        selectedTableNames.value,
    ).map((el) => el.value);
    const fixedSelection = fixupUserSelection([userSelectedColorBy], validOptions);

    return fixedSelection[0];
});
