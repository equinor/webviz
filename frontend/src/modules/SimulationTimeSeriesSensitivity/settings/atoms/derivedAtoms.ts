import { atom } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";
import type { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";

import { selectedRegularEnsembleIdentAtom, selectedVectorNameAndTagAtom } from "./persistableFixableAtoms";
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
        return [];
    }

    return createVectorSelectorDataFromVectors(availableVectorNames);
});

export const selectedVectorNameHasHistoricalAtom = atom<boolean>((get) => {
    const selectedVectorName = get(selectedVectorNameAndTagAtom).value.name;
    const vectorListQuery = get(vectorListQueryAtom);

    const selectedVector = vectorListQuery.data?.find((vec) => vec.name === selectedVectorName);
    return !!selectedVector?.hasHistorical;
});

export const vectorSpecificationAtom = atom<VectorSpec | null>((get) => {
    const selectedRegularEnsembleIdent = get(selectedRegularEnsembleIdentAtom).value;
    const selectedVectorName = get(selectedVectorNameAndTagAtom).value.name;
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
