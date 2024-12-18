import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";

import { atom } from "jotai";

import {
    syncedEnsembleIdentsAtom,
    syncedVectorNameAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedSensitivityNamesAtom,
    userSelectedVectorNameAtom,
    userSelectedVectorTagAtom,
} from "./baseAtoms";
import { vectorListQueryAtom } from "./queryAtoms";

import { fixupVectorName } from "../utils/fixupVectorName";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const syncedEnsembleIdents = get(syncedEnsembleIdentsAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(userSelectedEnsembleIdent, syncedEnsembleIdents);
    const fixedUpEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    return fixedUpEnsembleIdent;
});

export const availableSensitivityNamesAtom = atom<string[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    const ensemble = selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null;
    const ensembleSensitivityNames = ensemble?.getSensitivities()?.getSensitivityNames() ?? [];

    return ensembleSensitivityNames;
});

export const selectedSensitivityNamesAtom = atom<string[]>((get) => {
    const userSelectedSensitivityNames = get(userSelectedSensitivityNamesAtom);
    const availableSensitivityNames = get(availableSensitivityNamesAtom);

    // If userSelectedSensitivityNames is empty, do not override it
    if (!userSelectedSensitivityNames || userSelectedSensitivityNames.length === 0) {
        return [];
    }

    // Fixup invalid sensitivity names
    // - If no valid sensitivity names are selected, the change can be due to new available sensitivity names
    const fixedUpSensitivityNames =
        userSelectedSensitivityNames?.filter((sens) => availableSensitivityNames.includes(sens)) ?? [];
    if (fixedUpSensitivityNames.length === 0) {
        return availableSensitivityNames;
    }

    return fixedUpSensitivityNames;
});

export const availableVectorNamesAtom = atom<string[]>((get) => {
    const vectorListQuery = get(vectorListQueryAtom);
    return vectorListQuery.data?.map((vec) => vec.name) ?? [];
});

export const vectorSelectorDataAtom = atom((get) => {
    const isFetching = get(vectorListQueryAtom).isFetching;
    const availableVectorNames = get(availableVectorNamesAtom);

    if (isFetching) {
        return [];
    }

    return createVectorSelectorDataFromVectors(availableVectorNames);
});

/**
 * Atom that handles vector name and tag in synch with fixup
 */
const fixedUpVectorNameAndTagAtom = atom<{ name: string | null; tag: string | null }>((get) => {
    const syncedVectorName = get(syncedVectorNameAtom);
    const userSelectedVectorName = get(userSelectedVectorNameAtom);
    const userSelectedVectorTag = get(userSelectedVectorTagAtom);
    const availableVectorNames = get(availableVectorNamesAtom);

    // Override with synced vector name if available
    if (syncedVectorName) {
        return { name: syncedVectorName, tag: syncedVectorName };
    }

    // If vector name is fixed up, adjust tag as well
    const fixedUpVectorName = fixupVectorName(userSelectedVectorName, availableVectorNames);
    if (fixedUpVectorName !== userSelectedVectorName) {
        return { name: fixedUpVectorName, tag: fixedUpVectorName };
    }

    return { name: userSelectedVectorName, tag: userSelectedVectorTag };
});

export const selectedVectorNameAtom = atom<string | null>((get) => {
    const fixedUpVectorName = get(fixedUpVectorNameAndTagAtom).name;
    return fixedUpVectorName;
});

export const selectedVectorTagAtom = atom<string | null>((get) => {
    const fixedUpVectorTag = get(fixedUpVectorNameAndTagAtom).tag;
    return fixedUpVectorTag;
});

export const selectedVectorNameHasHistoricalAtom = atom<boolean>((get) => {
    const selectedVectorName = get(selectedVectorNameAtom);
    const vectorListQuery = get(vectorListQueryAtom);

    const selectedVector = vectorListQuery.data?.find((vec) => vec.name === selectedVectorName);
    return !!selectedVector?.has_historical;
});

export const vectorSpecificationAtom = atom<VectorSpec | null>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedVectorName = get(selectedVectorNameAtom);
    const selectedVectorNameHasHistorical = get(selectedVectorNameHasHistoricalAtom);

    if (!selectedEnsembleIdent || !selectedVectorName) {
        return null;
    }

    return {
        ensembleIdent: selectedEnsembleIdent,
        vectorName: selectedVectorName,
        hasHistorical: selectedVectorNameHasHistorical,
    };
});
