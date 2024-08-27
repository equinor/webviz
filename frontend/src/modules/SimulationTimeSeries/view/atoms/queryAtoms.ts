import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { EnsembleVectorObservationDataMap, VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";
import { QueryObserverResult } from "@tanstack/react-query";

import {
    resampleFrequencyAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import { validEnsembleRealizationsFunctionAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorDataQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(validEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        return () => ({
            queryKey: [
                "getRealizationsVectorData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getRealizationsVectorData(
                    item.ensembleIdent.getCaseUuid() ?? "",
                    item.ensembleIdent.getEnsembleName() ?? "",
                    item.vectorName ?? "",
                    resampleFrequency,
                    realizations
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
    const validEnsembleRealizationsFunction = get(validEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        return () => ({
            queryKey: [
                "getStatisticalVectorData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getStatisticalVectorData(
                    item.ensembleIdent.getCaseUuid() ?? "",
                    item.ensembleIdent.getEnsembleName() ?? "",
                    item.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.MONTHLY,
                    undefined,
                    realizations
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
