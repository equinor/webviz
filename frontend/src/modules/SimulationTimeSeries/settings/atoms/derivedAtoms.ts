import { VectorDefinitionsType } from "@assets/vectorDefinitions";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { filterEnsembleIdentsByType } from "@framework/utils/ensembleIdentUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { createDerivedVectorDescription } from "@modules/SimulationTimeSeries/utils/vectorDescriptionUtils";
import { createVectorSelectorDataFromVectors } from "@modules/_shared/components/VectorSelector";
import { simulationVectorDefinition } from "@modules/_shared/reservoirSimulationStringUtils";

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

export const selectedEnsembleIdentsAtom = atom<(RegularEnsembleIdent | DeltaEnsembleIdent)[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = userSelectedEnsembleIdents.filter((ensemble) =>
        ensembleSet.hasEnsemble(ensemble)
    );
    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const selectedRegularEnsemblesAtom = atom<RegularEnsemble[]>((get) => {
    // NOTE: Used for view and color by parameter, i.e. not for delta ensembles yet!
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const selectedRegularEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, RegularEnsembleIdent);

    const selectedRegularEnsembles: RegularEnsemble[] = [];
    for (const regularEnsembleIdent of selectedRegularEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(regularEnsembleIdent);
        if (ensemble) {
            selectedRegularEnsembles.push(ensemble);
        }
    }

    return selectedRegularEnsembles;
});

export const selectedDeltaEnsemblesAtom = atom<DeltaEnsemble[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const selectedDeltaEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, DeltaEnsembleIdent);

    const selectedDeltaEnsembles: DeltaEnsemble[] = [];
    for (const deltaEnsembleIdent of selectedDeltaEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(deltaEnsembleIdent);
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
    const regularEnsembleIdents = filterEnsembleIdentsByType(selectedEnsembleIdents, RegularEnsembleIdent);
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

export const ensembleVectorListsHelperAtom = atom<EnsembleVectorListsHelper>((get) => {
    const vectorListQueries = get(vectorListQueriesAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
});

export const vectorSelectorDataAtom = atom((get) => {
    const isFetching = get(isVectorListQueriesFetchingAtom);
    const ensembleVectorListsHelper = get(ensembleVectorListsHelperAtom);

    if (isFetching) {
        return [];
    }

    const vectorNames = ensembleVectorListsHelper.vectorNamesUnion();

    return createVectorSelectorDataFromVectors(vectorNames);
});

export const customVectorDefinitionsAtom = atom<VectorDefinitionsType | null>((get) => {
    const isFetching = get(isVectorListQueriesFetchingAtom);
    const ensembleVectorListsHelper = get(ensembleVectorListsHelperAtom);

    if (isFetching) {
        return null;
    }

    const vectors = ensembleVectorListsHelper.vectorsUnion();

    const customVectorDefinitions: VectorDefinitionsType = {};
    for (const vector of vectors) {
        if (!vector.derivedVector) {
            continue;
        }

        // Only add custom definitions parent nodes
        const parentNodeName = vector.name.split(":", 2)[0];
        const sourceVectorBaseName = vector.derivedVector.sourceVector.split(":", 2)[0];
        const adjustedDerivedVector = {
            ...vector.derivedVector,
            sourceVector: sourceVectorBaseName,
        };
        const type = simulationVectorDefinition(vector.derivedVector.sourceVector)?.type ?? "";
        const derivedVectorDescription = createDerivedVectorDescription(vector.name, adjustedDerivedVector);
        customVectorDefinitions[parentNodeName] = { type, description: derivedVectorDescription };
    }

    return customVectorDefinitions;
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
                ensembleIdent,
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
