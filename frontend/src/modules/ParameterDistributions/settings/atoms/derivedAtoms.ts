import { atom } from "jotai";

import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { EnsembleMode } from "@modules/ParameterDistributions/typesAndEnums";

import { showConstantParametersAtom, showLogParametersAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedEnsembleModeAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./persistedAtoms";

export const intersectedParameterIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    let selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const priorEnsembleIdent = get(selectedPriorEnsembleIdentAtom).value;
    const posteriorEnsembleIdent = get(selectedPosteriorEnsembleIdentAtom).value;
    const ensembleMode = get(selectedEnsembleModeAtom).value;
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
