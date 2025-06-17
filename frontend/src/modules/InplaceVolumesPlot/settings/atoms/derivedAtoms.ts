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
import type { SelectorColumn, TableSourceAndIndexUnion } from "@modules/_shared/InplaceVolumes/types";
import { RealSelector } from "@modules/_shared/InplaceVolumes/types";

import { makeColorByOptions, makeSubplotByOptions } from "../utils/plotDimensionUtils";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedResultName2Atom,
    userSelectedResultNameAtom,
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
    const selectedResultName = get(selectedResultNameAtom);
    const selectedResultName2 = get(selectedResultName2Atom);
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

    if (!selectedResultName || !tableDefinitionsAccessor.hasResultName(selectedResultName)) {
        return false;
    }

    if (selectedResultName2 && !tableDefinitionsAccessor.hasResultName(selectedResultName2)) {
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

export const selectedResultNameAtom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedResultNameAtom);
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

export const selectedResultName2Atom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedResultName2Atom);
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

export const selectedSelectorColumnAtom = atom<SelectorColumn | null>((get) => {
    const userSelectedSelectorColumn = get(userSelectedSelectorColumnAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const possibleSelectorColumns = [
        RealSelector.REAL,
        ...tableDefinitionsAccessor.getCommonIndicesWithValues().map((elm) => elm.indexColumn),
    ];
    if (!userSelectedSelectorColumn) {
        return possibleSelectorColumns[0];
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

export const selectedSubplotByAtom = atom<TableSourceAndIndexUnion>((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames).map((el) => el.value);
    const fixedSelection = fixupUserSelection([userSelectedSubplotBy], validOptions);

    return fixedSelection[0];
});

export const selectedColorByAtom = atom<TableSourceAndIndexUnion>((get) => {
    const userSelectedColorBy = get(userSelectedColorByAtom);
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeColorByOptions(tableDefinitionsAccessor, userSelectedSubplotBy, selectedTableNames).map(
        (el) => el.value,
    );
    const fixedSelection = fixupUserSelection([userSelectedColorBy], validOptions);

    return fixedSelection[0];
});
