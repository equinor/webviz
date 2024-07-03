import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { MAX_PARAMETERS } from "@modules/ParameterDistributionMatrix/typesAndEnums";

import { atom } from "jotai";

import {
    showConstantParametersAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentsAtom,
} from "./baseAtoms";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    return computedEnsembleIdents;
});

export const intersectedParameterIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const showConstantParameters = get(showConstantParametersAtom);

    if (selectedEnsembleIdents.length === 0) return [];

    // Find set of parameter idents per ensemble
    const ensembleParameterSets: Set<ParameterIdent>[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) continue;

        const parameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter(
                (parameter) =>
                    (showConstantParameters || !parameter.isConstant) && parameter.type === ParameterType.CONTINUOUS
            );
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
    if (userSelectedParameterIdents.length === 0) return intersectedParameterIdents.slice(0, MAX_PARAMETERS);
    return userSelectedParameterIdents.filter((ident) =>
        intersectedParameterIdents.some((intersectIdent) => intersectIdent.equals(ident))
    );
});
