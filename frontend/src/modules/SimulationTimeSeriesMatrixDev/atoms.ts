import { Frequency_api, StatisticFunction_api, VectorDescription_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithCompare, atomWithQueries } from "@framework/AtomStoreMaster";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { Getter, atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { isEqual } from "lodash";

import { FanchartStatisticOption, GroupBy, StatisticsSelection, VectorSpec, VisualizationMode } from "./state";
import { EnsembleVectorListsHelper } from "./utils/ensemblesVectorListHelper";

export const resampleFrequencyAtom = atom<Frequency_api | null>(null);

export const groupByAtom = atom<GroupBy>(GroupBy.TIME_SERIES);

export const colorRealizationsByParameterAtom = atom<boolean>(false);

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);

export const showHistoricalAtom = atom<boolean>(true);

export const showObservationsAtom = atom<boolean>(true);

export const statisticsSelectionAtom = atom<StatisticsSelection>({
    IndividualStatisticsSelection: Object.values(StatisticFunction_api),
    FanchartStatisticsSelection: Object.values(FanchartStatisticOption),
});

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], isEqual);

export const selectedEnsembleIdentsAtom = atom<EnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = selectedEnsembleIdents.filter((ensemble) => ensembleSet.hasEnsemble(ensemble));

    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const continuousAndNonConstantParametersUnionAtom = atom<Parameter[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const continuousAndNonConstantParametersUnion: Parameter[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
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

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
        });
    });

    return {
        queries,
    };
});

export const vectorListDataAtom = atom<(VectorDescription_api[] | null)[]>((get) => {
    const vectorListQueries = get(vectorListQueriesAtom);
    const oldVectorListData: (VectorDescription_api[] | null)[] = get(vectorListDataAtom);

    const newVectorListData = vectorListQueries.map((query) => {
        return query.data ?? null;
    });

    if (isEqual(newVectorListData, oldVectorListData)) {
        return oldVectorListData;
    }

    return newVectorListData;
});

export const ensembleVectorListsHelperAtom = atom((get) => {
    const vectorListQueries = get(vectorListQueriesAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
});

export const selectedVectorNamesAtom = atomWithCompare<string[]>([], isEqual);

export const vectorSpecificationsAtom = atom<VectorSpec[]>((get) => {
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
                vectorName,
                hasHistoricalVector: ensembleVectorListsHelper.hasHistoricalVector(ensembleIdent, vectorName),
            });
        }
    }

    return vectorSpecifications;
});

export const filteredParameterIdentListAtom = atom<ParameterIdent[]>([]);

export const userSelectedParameterIdentStringAtom = atom<string | null>(null);

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
