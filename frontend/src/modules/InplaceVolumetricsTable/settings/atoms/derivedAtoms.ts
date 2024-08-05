import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
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
        return tableDefinitionsAccessor.getUniqueFluidZones();
    }

    return fixupUserSelection(userSelectedFluidZones, tableDefinitionsAccessor.getUniqueFluidZones());
});

export const selectedResultNamesAtom = atom<InplaceVolumetricResultName_api[]>((get) => {
    const userSelectedResultNames = get(userSelectedResultNamesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const fixedSelection = fixupUserSelection(userSelectedResultNames, tableDefinitionsAccessor.getUniqueResultNames());

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
    for (const identifier of tableDefinitionsAccessor.getUniqueIdentifierValues()) {
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

    const uniqueIdentifierValues = tableDefinitionsAccessor.getUniqueIdentifierValues();
    const fixedUpIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = [];

    if (!userSelectedIdentifierValues) {
        for (const entry of uniqueIdentifierValues) {
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: fixupUserSelection(
                    entry.values,
                    uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? []
                ),
            });
        }
        return fixedUpIdentifierValues;
    }

    for (const entry of userSelectedIdentifierValues) {
        fixedUpIdentifierValues.push({
            identifier: entry.identifier,
            values: fixupUserSelection(
                entry.values,
                uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? []
            ),
        });
    }

    if (userSelectedIdentifierValues.length === 0) {
        for (const entry of uniqueIdentifierValues) {
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
            });
        }
    }

    return fixedUpIdentifierValues;
});

function fixupUserSelection<TSelection>(userSelection: TSelection[], validOptions: TSelection[]): TSelection[] {
    const newSelections = userSelection.filter((selection) => validOptions.includes(selection));
    if (newSelections.length === 0 && validOptions.length > 0) {
        newSelections.push(validOptions[0]);
    }

    return newSelections;
}
