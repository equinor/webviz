import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIdentifierValues } from "@modules/_shared/InplaceVolumetrics/fixupUserSelectedIdentifierValues";
import { RealSelector, SelectorColumn, SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";
import {
    TableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "@modules_shared/InplaceVolumetrics/TableDefinitionsAccessor";

import { atom } from "jotai";

import {
    userSelectedColorByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedResultName2Atom,
    userSelectedResultNameAtom,
    userSelectedSelectorColumnAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNamesAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

import { makeColorByOptions, makeSubplotByOptions } from "../utils/plotDimensionUtils";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    if (!userSelectedEnsembleIdents) {
        if (ensembleSet.getEnsembleArr().length === 0) {
            return [];
        }
        return [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble)
    );

    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const tableDefinitionsAccessorAtom = atom<TableDefinitionsAccessor>((get) => {
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitions = get(tableDefinitionsQueryAtom);

    return new TableDefinitionsAccessor(tableDefinitions.isLoading ? [] : tableDefinitions.data, selectedTableNames);
});

export const areTableDefinitionSelectionsValidAtom = atom<boolean>((get) => {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedFluidZones = get(selectedFluidZonesAtom);
    const selectedResultName = get(selectedResultNameAtom);
    const selectedResultName2 = get(selectedResultName2Atom);
    const selectedIdentifiersWithValues = get(selectedIdentifiersValuesAtom);

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

    if (!tableDefinitionsAccessor.hasFluidZones(selectedFluidZones)) {
        return false;
    }

    if (!selectedResultName || !tableDefinitionsAccessor.hasResultName(selectedResultName)) {
        return false;
    }

    if (selectedResultName2 && !tableDefinitionsAccessor.hasResultName(selectedResultName2)) {
        return false;
    }

    if (!tableDefinitionsAccessor.hasIdentifiersWithValues(selectedIdentifiersWithValues)) {
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

export const selectedFluidZonesAtom = atom<FluidZone_api[]>((get) => {
    const userSelectedFluidZones = get(userSelectedFluidZonesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    if (!userSelectedFluidZones) {
        return tableDefinitionsAccessor.getFluidZonesIntersection();
    }

    return fixupUserSelection(userSelectedFluidZones, tableDefinitionsAccessor.getFluidZonesIntersection(), true);
});

export const selectedResultNameAtom = atom<InplaceVolumetricResultName_api | null>((get) => {
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
        tableDefinitionsAccessor.getResultNamesIntersection()
    );
    if (fixedSelection.length === 0) {
        return null;
    }

    return fixedSelection[0];
});

export const selectedResultName2Atom = atom<InplaceVolumetricResultName_api | null>((get) => {
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
        tableDefinitionsAccessor.getResultNamesIntersection()
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
        ...tableDefinitionsAccessor.getIdentifiersWithIntersectionValues().map((ident) => ident.identifier),
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

export const selectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[]>((get) => {
    const userSelectedIdentifierValues = get(userSelectedIdentifiersValuesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const uniqueIdentifierValues = tableDefinitionsAccessor.getIdentifiersWithIntersectionValues();
    const selectAllOnFixup = true;

    const fixedUpIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = fixupUserSelectedIdentifierValues(
        userSelectedIdentifierValues,
        uniqueIdentifierValues,
        selectAllOnFixup
    );

    return fixedUpIdentifierValues;
});

export const selectedSubplotByAtom = atom<SourceAndTableIdentifierUnion>((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames).map((el) => el.value);
    const fixedSelection = fixupUserSelection([userSelectedSubplotBy], validOptions);

    return fixedSelection[0];
});

export const selectedColorByAtom = atom<SourceAndTableIdentifierUnion>((get) => {
    const userSelectedColorBy = get(userSelectedColorByAtom);
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const validOptions = makeColorByOptions(tableDefinitionsAccessor, userSelectedSubplotBy, selectedTableNames).map(
        (el) => el.value
    );
    const fixedSelection = fixupUserSelection([userSelectedColorBy], validOptions);

    return fixedSelection[0];
});
