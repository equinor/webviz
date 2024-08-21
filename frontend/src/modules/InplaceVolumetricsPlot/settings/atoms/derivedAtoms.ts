import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";
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

export const selectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[]>((get) => {
    const userSelectedIdentifierValues = get(userSelectedIdentifiersValuesAtom);
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

    const uniqueIdentifierValues = tableDefinitionsAccessor.getIdentifiersWithIntersectionValues();
    const fixedUpIdentifierValues: InplaceVolumetricsIdentifierWithValues_api[] = [];

    if (!userSelectedIdentifierValues) {
        for (const entry of uniqueIdentifierValues) {
            fixedUpIdentifierValues.push({
                identifier: entry.identifier,
                values: fixupUserSelection(
                    entry.values,
                    uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
                    true
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
                uniqueIdentifierValues.find((el) => el.identifier === entry.identifier)?.values ?? [],
                true
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

function fixupUserSelection<TSelection>(
    userSelection: TSelection[],
    validOptions: TSelection[],
    selectAll: boolean = false
): TSelection[] {
    const newSelections = userSelection.filter((selection) => validOptions.includes(selection));
    if (newSelections.length === 0 && validOptions.length > 0) {
        if (selectAll) {
            return validOptions;
        }
        newSelections.push(validOptions[0]);
    }

    return newSelections;
}
