import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import type { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";

import { atom } from "jotai";

import {
    syncedRegularEnsembleIdentsAtom,
    syncedVectorNameAtom,
    userSelectedRegularEnsembleIdentAtom,
    userSelectedSensitivityNamesAtom,
    userSelectedVectorNameAndTagAtom,
} from "./baseAtoms";
import { vectorListQueryAtom } from "./queryAtoms";

import { fixupVectorName } from "../utils/fixupVectorName";

export const selectedRegularEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const syncedRegularEnsembleIdents = get(syncedRegularEnsembleIdentsAtom);
    const userSelectedRegularEnsembleIdent = get(userSelectedRegularEnsembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(
        userSelectedRegularEnsembleIdent,
        syncedRegularEnsembleIdents,
    );
    const fixedUpEnsembleIdent = fixupRegularEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    return fixedUpEnsembleIdent;
});

export const availableSensitivityNamesAtom = atom<string[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedRegularEnsembleIdentAtom);

    const ensemble = selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null;
    const ensembleSensitivityNames = ensemble?.getSensitivities()?.getSensitivityNames() ?? [];

    return [...ensembleSensitivityNames];
});

export const selectedSensitivityNamesAtom = atom<string[]>((get) => {
    const userSelectedSensitivityNames = get(userSelectedSensitivityNamesAtom);
    const availableSensitivityNames = get(availableSensitivityNamesAtom);

    // If userSelectedSensitivityNames is empty, do not override it (i.e. deselect all)
    if (userSelectedSensitivityNames && userSelectedSensitivityNames.length === 0) {
        return [];
    }

    // Fixup invalid sensitivity names
    // - If user selected sensitivity names is null, the module is considered uninitialized
    // - If user selected sensitivity names fixup results in empty array, it is due to new available sensitivity
    //   names, and all are selected.
    const fixedUpSensitivityNames =
        userSelectedSensitivityNames?.filter((sens) => availableSensitivityNames.includes(sens)) ?? null;
    if (!fixedUpSensitivityNames || fixedUpSensitivityNames.length === 0) {
        return [...availableSensitivityNames];
    }

    return [...fixedUpSensitivityNames];
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
const selectedVectorNameAndTagAtom = atom<{ name: string | null; tag: string | null }>((get) => {
    const syncedVectorName = get(syncedVectorNameAtom);
    const userSelectedVectorNameAndTag = get(userSelectedVectorNameAndTagAtom);
    const availableVectorNames = get(availableVectorNamesAtom);

    // Override with synced vector name if available
    if (syncedVectorName) {
        return { name: syncedVectorName, tag: syncedVectorName };
    }

    // If vector name is fixed up, adjust tag as well
    const userSelectedVectorName = userSelectedVectorNameAndTag.name;
    const fixedUpVectorName = fixupVectorName(userSelectedVectorName, availableVectorNames);
    if (fixedUpVectorName !== userSelectedVectorName) {
        return { name: fixedUpVectorName, tag: fixedUpVectorName };
    }

    return { name: userSelectedVectorName, tag: userSelectedVectorNameAndTag.tag };
});

const selectedVectorNameAtom = atom<string | null>((get) => {
    const userSelectedVectorNameAndTag = get(selectedVectorNameAndTagAtom);
    return userSelectedVectorNameAndTag.name;
});

export const selectedVectorTagAtom = atom<string | null>((get) => {
    const userSelectedVectorNameAndTag = get(selectedVectorNameAndTagAtom);
    return userSelectedVectorNameAndTag.tag;
});

export const selectedVectorNameHasHistoricalAtom = atom<boolean>((get) => {
    const selectedVectorName = get(selectedVectorNameAtom);
    const vectorListQuery = get(vectorListQueryAtom);

    const selectedVector = vectorListQuery.data?.find((vec) => vec.name === selectedVectorName);
    return !!selectedVector?.hasHistorical;
});

export const vectorSpecificationAtom = atom<VectorSpec | null>((get) => {
    const selectedRegularEnsembleIdent = get(selectedRegularEnsembleIdentAtom);
    const selectedVectorName = get(selectedVectorNameAtom);
    const selectedVectorNameHasHistorical = get(selectedVectorNameHasHistoricalAtom);

    if (!selectedRegularEnsembleIdent || !selectedVectorName) {
        return null;
    }

    return {
        ensembleIdent: selectedRegularEnsembleIdent,
        vectorName: selectedVectorName,
        hasHistorical: selectedVectorNameHasHistorical,
    };
});
