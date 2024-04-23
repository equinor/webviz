import {
    Frequency_api,
    Observations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import {
    EnsembleVectorObservationDataMap,
    VectorSpec,
    VisualizationMode,
} from "@modules/SimulationTimeSeries/typesAndEnums";
import { QueryObserverResult } from "@tanstack/react-query";

import { atom } from "jotai";

import { createLoadedVectorSpecificationAndDataArray } from "../utils/vectorSpecificationsAndQueriesUtils";

export type ViewAtoms = {
    userSelectedActiveTimestampUtcMs: number | null;
    activeTimestampUtcMs: number | null;
    vectorDataQueries: QueryObserverResult<VectorRealizationData_api[], Error>[];
    vectorStatisticsQueries: QueryObserverResult<VectorStatisticData_api, Error>[];
    historicalVectorDataQueries: QueryObserverResult<VectorHistoricalData_api, Error>[];
    vectorObservationsQueries: {
        isFetching: boolean;
        isError: boolean;
        ensembleVectorObservationDataMap: EnsembleVectorObservationDataMap;
    };
    queryIsFetching: boolean;
    realizationsQueryHasError: boolean;
    statisticsQueryHasError: boolean;
    historicalDataQueryHasError: boolean;
    loadedVectorSpecificationsAndRealizationData: {
        vectorSpecification: VectorSpec;
        data: VectorRealizationData_api[];
    }[];
    loadedVectorSpecificationsAndStatisticsData: {
        vectorSpecification: VectorSpec;
        data: VectorStatisticData_api;
    }[];
    loadedVectorSpecificationsAndHistoricalData: {
        vectorSpecification: VectorSpec;
        data: VectorHistoricalData_api;
    }[];
    colorByParameter: boolean;
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<Interface>
): ModuleAtoms<ViewAtoms> {
    const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);

    const vectorDataQueriesAtom = atomWithQueries((get) => {
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));
        const resampleFrequency = get(settingsToViewInterface.getAtom("resampleFrequency"));

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

    const vectorStatisticsQueriesAtom = atomWithQueries((get) => {
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));
        const resampleFrequency = get(settingsToViewInterface.getAtom("resampleFrequency"));
        const visualizationMode = get(settingsToViewInterface.getAtom("visualizationMode"));

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

    const historicalVectorDataQueriesAtom = atomWithQueries((get) => {
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));
        const resampleFrequency = get(settingsToViewInterface.getAtom("resampleFrequency"));

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

    const vectorObservationsQueriesAtom = atomWithQueries((get) => {
        const showObservations = get(settingsToViewInterface.getAtom("showObservations"));
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));

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

    const queryIsFetchingAtom = atom((get) => {
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

    const realizationsQueryHasErrorAtom = atom((get) => {
        const vectorDataQueries = get(vectorDataQueriesAtom);

        return vectorDataQueries.some((query) => query.isError);
    });

    const statisticsQueryHasErrorAtom = atom((get) => {
        const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);

        return vectorStatisticsQueries.some((query) => query.isError);
    });

    const historicalDataQueryHasErrorAtom = atom((get) => {
        const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);

        return historicalVectorDataQueries.some((query) => query.isError);
    });

    const loadedVectorSpecificationsAndRealizationDataAtom = atom((get) => {
        const vectorDataQueries = get(vectorDataQueriesAtom);
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));

        return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorDataQueries);
    });

    const loadedVectorSpecificationsAndStatisticsDataAtom = atom((get) => {
        const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));

        return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorStatisticsQueries);
    });

    const loadedVectorSpecificationsAndHistoricalDataAtom = atom((get) => {
        const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);
        const vectorSpecifications = get(settingsToViewInterface.getAtom("vectorSpecifications"));

        return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, historicalVectorDataQueries);
    });

    const activeTimestampUtcMsAtom = atom<number | null>((get) => {
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

    const colorByParameterAtom = atom<boolean>((get) => {
        const colorRealizationsByParameter = get(settingsToViewInterface.getAtom("colorByParameter"));
        const visualizationMode = get(settingsToViewInterface.getAtom("visualizationMode"));
        const parameterIdent = get(settingsToViewInterface.getAtom("parameterIdent"));
        const selectedEnsembles = get(settingsToViewInterface.getAtom("selectedEnsembles"));

        return (
            colorRealizationsByParameter &&
            visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS &&
            parameterIdent !== null &&
            selectedEnsembles.some((ensemble) => ensemble.getParameters().hasParameter(parameterIdent))
        );
    });

    return {
        userSelectedActiveTimestampUtcMs: userSelectedActiveTimestampUtcMsAtom,
        activeTimestampUtcMs: activeTimestampUtcMsAtom,
        vectorDataQueries: vectorDataQueriesAtom,
        vectorStatisticsQueries: vectorStatisticsQueriesAtom,
        historicalVectorDataQueries: historicalVectorDataQueriesAtom,
        vectorObservationsQueries: vectorObservationsQueriesAtom,
        queryIsFetching: queryIsFetchingAtom,
        realizationsQueryHasError: realizationsQueryHasErrorAtom,
        statisticsQueryHasError: statisticsQueryHasErrorAtom,
        historicalDataQueryHasError: historicalDataQueryHasErrorAtom,
        loadedVectorSpecificationsAndRealizationData: loadedVectorSpecificationsAndRealizationDataAtom,
        loadedVectorSpecificationsAndStatisticsData: loadedVectorSpecificationsAndStatisticsDataAtom,
        loadedVectorSpecificationsAndHistoricalData: loadedVectorSpecificationsAndHistoricalDataAtom,
        colorByParameter: colorByParameterAtom,
    };
}
