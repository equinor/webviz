import { atom } from "jotai";

import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { findSensitivityCaseLabelsWithoutRealizations } from "@modules/_shared/InplaceVolumes/sensitivityUtils";

import {
    areSelectedIndicesWithValuesValidAtom,
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    waterfallFactorSpecAtom,
    waterfallSourcesAtom,
} from "./baseAtoms";

/** Labels of selected sensitivity cases that have no valid realization after the realization filter. */
export const sensitivityCasesWithoutRealizationsAtom = atom<string[]>((get) => {
    const waterfallSources = get(waterfallSourcesAtom);
    if (!waterfallSources) {
        return [];
    }
    const ensembleSet = get(EnsembleSetAtom);
    const validRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const missingLabels = new Set<string>();
    for (const source of [waterfallSources.reference, waterfallSources.comparison]) {
        const sensitivities = ensembleSet.findEnsemble(source.ensembleIdent)?.getSensitivities() ?? null;
        if (!source.sensitivityCase || !sensitivities) {
            continue;
        }
        const validRealizations = new Set(validRealizationsFunction(source.ensembleIdent));
        for (const label of findSensitivityCaseLabelsWithoutRealizations(
            sensitivities,
            [source.sensitivityCase],
            validRealizations,
        )) {
            missingLabels.add(label);
        }
    }
    return Array.from(missingLabels);
});

export const isWaterfallComputableAtom = atom((get) => {
    return (
        get(areSourcesDistinctAtom) &&
        get(areSelectedTablesComparableAtom) &&
        get(areSelectedIndicesWithValuesValidAtom) &&
        get(waterfallFactorSpecAtom) !== null &&
        get(waterfallSourcesAtom) !== null &&
        get(sensitivityCasesWithoutRealizationsAtom).length === 0
    );
});
