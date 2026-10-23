import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";
import type { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";

import {
    selectedRegularEnsembleIdentAtom,
    selectedSensitivityNamesAtom,
    selectedVectorNameAndTagAtom,
} from "./persistableFixableAtoms";
import { vectorListQueryAtom } from "./queryAtoms";

export const availableSensitivityNamesAtom = atom<string[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedRegularEnsembleIdentAtom).value;

    const ensemble = selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null;
    const ensembleSensitivityNames = ensemble?.getSensitivities()?.getSensitivityNames() ?? [];

    return [...ensembleSensitivityNames];
});

export const availableVectorNamesAtom = atom<string[]>((get) => {
    const vectorListQuery = get(vectorListQueryAtom);
    return vectorListQuery.data?.map((vec) => vec.name) ?? [];
});

export const vectorSelectorDataAtom = atom((get) => {
    const isFetching = get(vectorListQueryAtom).isFetching;
    const availableVectorNames = get(availableVectorNamesAtom);

    if (isFetching) {
        return null;
    }

    return createVectorSelectorDataFromVectors(availableVectorNames);
});

export const selectedVectorNameHasHistoricalAtom = atom<boolean>((get) => {
    const vectorListQuery = get(vectorListQueryAtom);
    const selectedVectorName = get(selectedVectorNameAndTagAtom).value?.name ?? null;

    if (!selectedVectorName) {
        return false;
    }

    const selectedVector = vectorListQuery.data?.find((vec) => vec.name === selectedVectorName);
    return !!selectedVector?.hasHistorical;
});

export const vectorSpecificationAtom = atom<VectorSpec | null>((get) => {
    const selectedRegularEnsembleIdent = get(selectedRegularEnsembleIdentAtom);
    const selectedVectorNameAndTag = get(selectedVectorNameAndTagAtom);
    const selectedSensitivityNames = get(selectedSensitivityNamesAtom);
    const selectedVectorNameHasHistorical = get(selectedVectorNameHasHistoricalAtom);

    // The view's data queries are enabled whenever a specification exists, so withhold it while any
    // selection is invalid. Sensitivity names are included since the view looks each one up in the
    // ensemble's sensitivities, which throws for a name the ensemble doesn't have
    if (
        !selectedRegularEnsembleIdent.isValidInContext ||
        !selectedVectorNameAndTag.isValidInContext ||
        !selectedSensitivityNames.isValidInContext
    ) {
        return null;
    }

    const ensembleIdent = selectedRegularEnsembleIdent.value;
    const vectorName = selectedVectorNameAndTag.value?.name ?? null;
    if (!ensembleIdent || !vectorName) {
        return null;
    }

    return {
        ensembleIdent,
        vectorName,
        hasHistorical: selectedVectorNameHasHistorical,
    };
});
