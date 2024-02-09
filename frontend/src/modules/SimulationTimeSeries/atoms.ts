import {
    Frequency_api,
    Observations_api,
    StatisticFunction_api,
    SummaryVectorObservations_api,
    VectorDescription_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { createVectorSelectorDataFromVectors } from "@framework/components/VectorSelector";
import { atomWithCompare, atomWithQueries } from "@framework/utils/atomUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { QueryObserverResult } from "@tanstack/query-core";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { FanchartStatisticOption, GroupBy, StatisticsSelection, VectorSpec, VisualizationMode } from "./typesAndEnums";
import { EnsembleVectorListsHelper } from "./utils/ensemblesVectorListHelper";
import { createLoadedVectorSpecificationAndDataArray } from "./utils/vectorSpecificationsAndQueriesUtils";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

/**
 * Definition of ensemble vector observation data
 *
 * hasSummaryObservations: true if the ensemble has observations, i.e the summary observations array is not empty
 * vectorsObservationData: array of vector observation data for requested vector specifications
 */
export type EnsembleVectorObservationData = {
    hasSummaryObservations: boolean;
    vectorsObservationData: { vectorSpecification: VectorSpec; data: SummaryVectorObservations_api }[];
};

/**
 * Definition of map of ensemble ident and ensemble vector observation data
 */
export type EnsembleVectorObservationDataMap = Map<EnsembleIdent, EnsembleVectorObservationData>;

/**
 * Definition of vector observations queries result for combined queries
 */
export type VectorObservationsQueriesResult = {
    isFetching: boolean;
    isError: boolean;
    ensembleVectorObservationDataMap: EnsembleVectorObservationDataMap;
};

export const resampleFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);

export const groupByAtom = atom<GroupBy>(GroupBy.TIME_SERIES);

export const colorRealizationsByParameterAtom = atom<boolean>(false);

export enum StatisticsType {
    INDIVIDUAL = "Individual",
    FANCHART = "Fanchart",
}

export const statisticsTypeAtom = atom<StatisticsType>((get) => {
    const visualizationMode = get(visualizationModeAtom);

    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        return StatisticsType.FANCHART;
    }

    return StatisticsType.INDIVIDUAL;
});

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

export const selectedEnsemblesAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const selectedEnsembles: Ensemble[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            selectedEnsembles.push(ensemble);
        }
    }

    return selectedEnsembles;
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

// Derived atoms should cache the result of their PURE function as long as their dependencies don't change.
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

export const vectorDataQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);

    const queries = vectorSpecifications.map((item) => {
        return () => ({
            queryKey: [
                "getRealizationsVectorData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.vectorName,
                resampleFrequency,
            ],
            queryFn: () =>
                apiService.timeseries.getRealizationsVectorData(
                    item.ensembleIdent.getCaseUuid() ?? "",
                    item.ensembleIdent.getEnsembleName() ?? "",
                    item.vectorName ?? "",
                    resampleFrequency
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(item.vectorName && item.ensembleIdent.getCaseUuid() && item.ensembleIdent.getEnsembleName()),
        });
    });

    return {
        queries,
    };
});

export const vectorStatisticsQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);

    const enabled =
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        return () => ({
            queryKey: [
                "getStatisticalVectorData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.vectorName,
                resampleFrequency,
            ],
            queryFn: () =>
                apiService.timeseries.getStatisticalVectorData(
                    item.ensembleIdent.getCaseUuid() ?? "",
                    item.ensembleIdent.getEnsembleName() ?? "",
                    item.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.MONTHLY,
                    undefined,
                    undefined
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                item.vectorName &&
                item.ensembleIdent.getCaseUuid() &&
                item.ensembleIdent.getEnsembleName()
            ),
        });
    });

    return {
        queries,
    };
});

export const historicalVectorDataQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);

    const vectorSpecificationsWithHistoricalData = vectorSpecifications?.filter((vec) => vec.hasHistoricalVector);
    const enabled = vectorSpecificationsWithHistoricalData?.some((vec) => vec.hasHistoricalVector) ?? false;

    const queries = vectorSpecifications.map((item) => {
        return () => ({
            queryKey: [
                "getHistoricalVectorData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.vectorName,
                resampleFrequency,
            ],
            queryFn: () =>
                apiService.timeseries.getHistoricalVectorData(
                    item.ensembleIdent.getCaseUuid() ?? "",
                    item.ensembleIdent.getEnsembleName() ?? "",
                    item.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.MONTHLY
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                item.vectorName &&
                item.ensembleIdent.getCaseUuid() &&
                item.ensembleIdent.getEnsembleName()
            ),
        });
    });

    return {
        queries,
    };
});

export const vectorObservationsQueriesAtom = atomWithQueries((get) => {
    const showObservations = get(showObservationsAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    const uniqueEnsembleIdents = [...new Set(vectorSpecifications?.map((item) => item.ensembleIdent) ?? [])];

    const queries = uniqueEnsembleIdents.map((item) => {
        return () => ({
            queryKey: ["getObservations", item.getCaseUuid(), item.getEnsembleName()],
            queryFn: () =>
                apiService.observations.getObservations(item.getCaseUuid() ?? "", item.getEnsembleName() ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(showObservations && item.getCaseUuid() && item.getEnsembleName()),
        });
    });

    return {
        queries,
        combine: (results: QueryObserverResult<Observations_api>[]) => {
            const combinedResult: EnsembleVectorObservationDataMap = new Map();
            if (!vectorSpecifications)
                return { isFetching: false, isError: false, ensembleVectorObservationDataMap: combinedResult };

            results.forEach((result, index) => {
                const ensembleIdent = uniqueEnsembleIdents.at(index);
                if (!ensembleIdent) return;

                const ensembleVectorSpecifications = vectorSpecifications.filter(
                    (item) => item.ensembleIdent === ensembleIdent
                );

                const ensembleHasObservations = result.data?.summary.length !== 0;
                combinedResult.set(ensembleIdent, {
                    hasSummaryObservations: ensembleHasObservations,
                    vectorsObservationData: [],
                });
                for (const vectorSpec of ensembleVectorSpecifications) {
                    const vectorObservationsData =
                        result.data?.summary.find((elm) => elm.vector_name === vectorSpec.vectorName) ?? null;
                    if (!vectorObservationsData) continue;

                    combinedResult.get(ensembleIdent)?.vectorsObservationData.push({
                        vectorSpecification: vectorSpec,
                        data: vectorObservationsData,
                    });
                }
            });

            return {
                isFetching: results.some((result) => result.isFetching),
                isError: results.some((result) => result.isError),
                ensembleVectorObservationDataMap: combinedResult,
            };
        },
    };
});

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);
    const vectorObservationsQueries = get(vectorObservationsQueriesAtom);

    return (
        vectorDataQueries.some((query) => query.isFetching) ||
        vectorStatisticsQueries.some((query) => query.isFetching) ||
        historicalVectorDataQueries.some((query) => query.isFetching) ||
        vectorObservationsQueries.isFetching
    );
});

export const realizationsQueryHasErrorAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);

    return vectorDataQueries.some((query) => query.isError);
});

export const statisticsQueryHasErrorAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);

    return vectorStatisticsQueries.some((query) => query.isError);
});

export const historicalDataQueryHasErrorAtom = atom((get) => {
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);

    return historicalVectorDataQueries.some((query) => query.isError);
});

export const loadedVectorSpecificationsAndRealizationDataAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorDataQueries);
});

export const loadedVectorSpecificationsAndStatisticsDataAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorStatisticsQueries);
});

export const loadedVectorSpecificationsAndHistoricalDataAtom = atom((get) => {
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, historicalVectorDataQueries);
});

export const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);

export const activeTimestampUtcMsAtom = atom<number | null>((get) => {
    const loadedVectorSpecificationsAndRealizationData = get(loadedVectorSpecificationsAndRealizationDataAtom);
    const isQueryFetching = get(queryIsFetchingAtom);
    const userSelectedActiveTimestampUtcMs = get(userSelectedActiveTimestampUtcMsAtom);

    if (
        !isQueryFetching &&
        userSelectedActiveTimestampUtcMs === null &&
        loadedVectorSpecificationsAndRealizationData.length > 0
    ) {
        const firstTimeStamp =
            loadedVectorSpecificationsAndRealizationData.at(0)?.data.at(0)?.timestamps_utc_ms[0] ?? null;
        return firstTimeStamp;
    }

    return userSelectedActiveTimestampUtcMs;
});

export const colorByParameterAtom = atom<boolean>((get) => {
    const colorRealizationsByParameter = get(colorRealizationsByParameterAtom);
    const visualizationMode = get(visualizationModeAtom);
    const parameterIdent = get(parameterIdentAtom);
    const selectedEnsembles = get(selectedEnsemblesAtom);

    return (
        colorRealizationsByParameter &&
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS &&
        parameterIdent !== null &&
        selectedEnsembles.some((ensemble) => ensemble.getParameters().hasParameter(parameterIdent))
    );
});
