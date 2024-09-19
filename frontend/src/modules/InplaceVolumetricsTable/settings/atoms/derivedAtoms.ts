import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIdentifierValues } from "@modules/_shared/InplaceVolumetrics/fixupUserSelectedIdentifierValues";
import { SourceAndTableIdentifierUnion, SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import {
    TableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "@modules_shared/InplaceVolumetrics/TableDefinitionsAccessor";

import { atom } from "jotai";

import {
    userSelectedAccumulationOptionsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedResultNamesAtom,
    userSelectedTableNamesAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

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
    const selectedResultNames = get(selectedResultNamesAtom);
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

    if (!tableDefinitionsAccessor.hasResultNames(selectedResultNames)) {
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

export const selectedResultNamesAtom = atom<InplaceVolumetricResultName_api[]>((get) => {
    const userSelectedResultNames = get(userSelectedResultNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const fixedSelection = fixupUserSelection(
        userSelectedResultNames,
        tableDefinitionsAccessor.getResultNamesIntersection()
    );

    return fixedSelection;
});

export const selectedAccumulationOptionsAtom = atom<
    Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[]
>((get) => {
    const userSelectedAccumulation = get(userSelectedAccumulationOptionsAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const availableUniqueAccumulationOptions: Omit<
        SourceAndTableIdentifierUnion,
        SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME
    >[] = [SourceIdentifier.FLUID_ZONE];
    for (const identifier of tableDefinitionsAccessor.getIdentifiersWithIntersectionValues()) {
        availableUniqueAccumulationOptions.push(identifier.identifier);
    }

    if (!userSelectedAccumulation || userSelectedAccumulation.length === 0) {
        return [];
    }

    return fixupUserSelection(userSelectedAccumulation, availableUniqueAccumulationOptions);
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
