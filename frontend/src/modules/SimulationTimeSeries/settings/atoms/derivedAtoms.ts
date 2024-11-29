import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";

import { atom } from "jotai";

import {
    filteredParameterIdentListAtom,
    selectedVectorNamesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentStringAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import { vectorListQueriesAtom } from "./queryAtoms";

import { StatisticsType, VectorSpec, VisualizationMode } from "../../typesAndEnums";
import { EnsembleVectorListsHelper } from "../../utils/ensemblesVectorListHelper";

export const statisticsTypeAtom = atom<StatisticsType>((get) => {
    const visualizationMode = get(visualizationModeAtom);

    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        return StatisticsType.FANCHART;
    }

    return StatisticsType.INDIVIDUAL;
});

export const selectedEnsembleIdentsAtom = atom<(EnsembleIdent | DeltaEnsembleIdent)[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = selectedEnsembleIdents.filter((ensemble) => ensembleSet.hasEnsemble(ensemble));
    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const selectedEnsemblesAtom = atom<Ensemble[]>((get) => {
    // NOTE: Used for view and color by parameter, i.e. not for delta ensembles yet!
    const ensembleSet = get(EnsembleSetAtom);
    const allSelectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const selectedEnsembleIdents = filterEnsembleIdentsByType(allSelectedEnsembleIdents, EnsembleIdent);

    const selectedEnsembles: Ensemble[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            selectedEnsembles.push(ensemble);
        }
    }

    return selectedEnsembles;
});

export const selectedDeltaEnsemblesAtom = atom<DeltaEnsemble[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const selectedDeltaEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, DeltaEnsembleIdent);

    const selectedDeltaEnsembles: DeltaEnsemble[] = [];
    for (const ensembleIdent of selectedDeltaEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            selectedDeltaEnsembles.push(ensemble);
        }
    }
    return selectedDeltaEnsembles;
});

export const continuousAndNonConstantParametersUnionAtom = atom<Parameter[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    // Does not support parameters for delta ensembles yet
    const hasAnyDeltaEnsembles = filterEnsembleIdentsByType(selectedEnsembleIdents, DeltaEnsembleIdent).length > 0;
    if (hasAnyDeltaEnsembles) {
        return [];
    }

    const continuousAndNonConstantParametersUnion: Parameter[] = [];
    const regularEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, EnsembleIdent);
    for (const ensembleIdent of regularEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            continue;
        }

        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        // Add non-duplicate parameters to list - verified by ParameterIdent
        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterInUnion = continuousAndNonConstantParametersUnion.some((elm) =>
                parameterIdent.equals(ParameterIdent.fromNameAndGroup(elm.name, elm.groupName))
            );

            if (isParameterInUnion) continue;
            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }

    return continuousAndNonConstantParametersUnion;
});

export const isVectorListQueriesFetchingAtom = atom<boolean>((get) => {
    const vectorListQueries = get(vectorListQueriesAtom);

    return vectorListQueries.some((query) => query.isFetching);
});

export const availableVectorNamesAtom = atom((get) => {
    const ensembleVectorListsHelper = get(ensembleVectorListsHelperAtom);

    const vectorNamesUnion = ensembleVectorListsHelper.vectorsUnion();

    return vectorNamesUnion;
});

export const vectorSelectorDataAtom = atom((get) => {
    const isFetching = get(isVectorListQueriesFetchingAtom);
    const availableVectorNames = get(availableVectorNamesAtom);

    if (isFetching) {
        return [];
    }

    return createVectorSelectorDataFromVectors(availableVectorNames);
});

export const ensembleVectorListsHelperAtom = atom<EnsembleVectorListsHelper>((get) => {
    const vectorListQueries = get(vectorListQueriesAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
});

export const vectorSpecificationsAtom = atom<VectorSpec[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const ensembleVectorListsHelper = get(ensembleVectorListsHelperAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedVectorNames = get(selectedVectorNamesAtom);

    const vectorSpecifications: VectorSpec[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        for (const vectorName of selectedVectorNames) {
            if (!ensembleVectorListsHelper.isVectorInEnsemble(ensembleIdent, vectorName)) {
                continue;
            }

            vectorSpecifications.push({
                ensembleIdent: ensembleIdent,
                color: ensembleSet.findEnsemble(ensembleIdent)?.getColor() ?? null,
                vectorName,
                hasHistoricalVector: ensembleVectorListsHelper.hasHistoricalVector(ensembleIdent, vectorName),
            });
        }
    }

    return vectorSpecifications;
});

export const selectedParameterIdentStringAtom = atom<string | null>((get) => {
    const filteredParameterIdentList = get(filteredParameterIdentListAtom);
    const userSelectedParameterIdentString = get(userSelectedParameterIdentStringAtom);

    if (filteredParameterIdentList.length === 0) {
        return null;
    }

    if (userSelectedParameterIdentString === null) {
        return filteredParameterIdentList[0].toString();
    }

    if (filteredParameterIdentList.some((elm) => elm.toString() === userSelectedParameterIdentString)) {
        return userSelectedParameterIdentString;
    }

    return filteredParameterIdentList[0].toString();
});

export const parameterIdentAtom = atom<ParameterIdent | null>((get) => {
    const selectedParameterIdentString = get(selectedParameterIdentStringAtom);
    const filteredParameterIdentList = get(filteredParameterIdentListAtom);

    if (selectedParameterIdentString === null) {
        return null;
    }

    try {
        const newParameterIdent = ParameterIdent.fromString(selectedParameterIdentString);
        const isParameterAmongFiltered = filteredParameterIdentList.some((parameter) =>
            parameter.equals(newParameterIdent)
        );
        if (isParameterAmongFiltered) {
            return newParameterIdent;
        } else {
            return null;
        }
    } catch {
        return null;
    }
});
