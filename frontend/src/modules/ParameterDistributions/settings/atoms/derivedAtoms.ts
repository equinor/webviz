import { atom } from "jotai";

import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { EnsembleMode } from "@modules/ParameterDistributions/typesAndEnums";
import { ParameterSortMethod } from "@modules/ParameterDistributions/view/utils/parameterSorting";

import {
    showConstantParametersAtom,
    showLogParametersAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedEnsembleModeAtom,
    userSelectedParameterIdentsAtom,
    userSelectedParameterSortingMethodAtom,
    userSelectedPosteriorEnsembleIdentAtom,
    userSelectedPriorEnsembleIdentAtom,
} from "./baseAtoms";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getRegularEnsembleArray().length > 0) {
        computedEnsembleIdents = [ensembleSet.getRegularEnsembleArray()[0].getIdent()];
    }

    return computedEnsembleIdents;
});
export const selectedPriorEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedPriorEnsembleIdentAtom);

    const validEnsembleIdent = fixupRegularEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const selectedPosteriorEnsembleIdentAtom = atom<RegularEnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedPosteriorEnsembleIdentAtom);

    if (!ensembleSet?.hasAnyRegularEnsembles()) {
        return null;
    }

    if (userSelectedEnsembleIdent && ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return userSelectedEnsembleIdent;
    }

    return ensembleSet.getRegularEnsembleArray().at(-1)?.getIdent() || null;
});
export const selectedEnsembleModeAtom = atom((get) => {
    const userSelectedEnsembleMode = get(userSelectedEnsembleModeAtom);
    const ensembleSet = get(EnsembleSetAtom);
    if (ensembleSet.getRegularEnsembleArray().length <= 1) {
        return EnsembleMode.INDEPENDENT;
    }
    return userSelectedEnsembleMode;
});
export const intersectedParameterIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    let selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const priorEnsembleIdent = get(selectedPriorEnsembleIdentAtom);
    const posteriorEnsembleIdent = get(selectedPosteriorEnsembleIdentAtom);
    const ensembleMode = get(selectedEnsembleModeAtom);
    const showConstantParameters = get(showConstantParametersAtom);
    const showLogParameters = get(showLogParametersAtom);

    // In prior/posterior mode, only use the selected prior/posterior ensembles
    if (ensembleMode === EnsembleMode.PRIOR_POSTERIOR && priorEnsembleIdent && posteriorEnsembleIdent) {
        selectedEnsembleIdents = [priorEnsembleIdent, posteriorEnsembleIdent];
    }
    if (selectedEnsembleIdents.length === 0) return [];

    // Find set of parameter idents per ensemble
    const ensembleParameterSets: Set<ParameterIdent>[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) continue;

        let parameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter(
                (parameter) =>
                    (showConstantParameters || !parameter.isConstant) && parameter.type === ParameterType.CONTINUOUS,
            );
        !showLogParameters && (parameters = parameters.filter((parameter) => !parameter.groupName?.includes("LOG"))); // Only include non-log parameters unless showLogParameters is true
        const identArr: ParameterIdent[] = [];
        for (const parameter of parameters) {
            identArr.push(new ParameterIdent(parameter.name, parameter.groupName));
        }
        const parameterIdents = new Set(identArr);
        if (parameterIdents.size > 0) {
            ensembleParameterSets.push(parameterIdents);
        }
    }

    if (ensembleParameterSets.length === 0) return [];

    // Intersection of parameters across ensembles
    const intersectedParameterIdents = ensembleParameterSets.reduce((acc, set) => {
        if (acc === null) return set;
        return new Set([...acc].filter((ident1) => [...set].some((ident2) => ident1.equals(ident2))));
    }, ensembleParameterSets[0] || new Set());

    return Array.from(intersectedParameterIdents).sort((a, b) => a.toString().localeCompare(b.toString()));
});

export const selectedParameterIdentsAtom = atom((get) => {
    const intersectedParameterIdents = get(intersectedParameterIdentsAtom);
    const userSelectedParameterIdents = get(userSelectedParameterIdentsAtom);
    // If unset (initial) use all parameters
    if (!userSelectedParameterIdents) return intersectedParameterIdents;
    // If empty (e.g. user has switched group or unselected all, keep empty)
    if (userSelectedParameterIdents.length === 0) return [];

    return userSelectedParameterIdents.filter((ident) =>
        intersectedParameterIdents.some((intersectIdent) => intersectIdent.equals(ident)),
    );
});

export const selectedParameterDistributionSortingMethodAtom = atom((get) => {
    const userSelectedParameterSortingMethod = get(userSelectedParameterSortingMethodAtom);
    const ensembleMode = get(selectedEnsembleModeAtom);
    if (ensembleMode === EnsembleMode.INDEPENDENT) {
        return ParameterSortMethod.ALPHABETICAL;
    }
    return userSelectedParameterSortingMethod;
});
