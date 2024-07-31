import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { EnsembleVectorObservationDataMap, VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";
import { QueryObserverResult } from "@tanstack/query-core";

import { atom } from "jotai";

import {
    interfaceColorByParameterAtom,
    parameterIdentAtom,
    resampleFrequencyAtom,
    selectedEnsemblesAtom,
    showObservationsAtom,
    userSelectedActiveTimestampUtcMsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";

import { createLoadedVectorSpecificationAndDataArray } from "../utils/vectorSpecificationsAndQueriesUtils";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorDataQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);

    const enabled =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

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
            queryKey: ["getObservations", item.getCaseUuid()],
            queryFn: () => apiService.observations.getObservations(item.getCaseUuid() ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(showObservations && item.getCaseUuid()),
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

    const vectorDataIsFetching = vectorDataQueries.some((query) => query.isFetching);
    const vectorStatisticsIsFetching = vectorStatisticsQueries.some((query) => query.isFetching);
    const historicalVectorDataIsFetching = historicalVectorDataQueries.some((query) => query.isFetching);
    const vectorObservationsIsFetching = vectorObservationsQueries.isFetching;

    const isFetching =
        vectorDataIsFetching ||
        vectorStatisticsIsFetching ||
        historicalVectorDataIsFetching ||
        vectorObservationsIsFetching;

    return isFetching;
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
    const colorRealizationsByParameter = get(interfaceColorByParameterAtom);
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
