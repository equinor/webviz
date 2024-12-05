import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { EnsembleVectorObservationDataMap, VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";
import { QueryObserverResult } from "@tanstack/react-query";

import {
    resampleFrequencyAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import { regularEnsembleVectorSpecificationsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorDataQueriesAtom = atomWithQueries((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        // Regular Ensemble
        if (isEnsembleIdentOfType(item.ensembleIdent, RegularEnsembleIdent)) {
            const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
            const vectorSpecification = {
                ...item,
                ensembleIdent: item.ensembleIdent,
            };

            return () => ({
                queryKey: [
                    "getRealizationsVectorData",
                    vectorSpecification.ensembleIdent.getCaseUuid(),
                    vectorSpecification.ensembleIdent.getEnsembleName(),
                    vectorSpecification.vectorName,
                    resampleFrequency,
                    realizations,
                ],
                queryFn: () =>
                    apiService.timeseries.getRealizationsVectorData(
                        vectorSpecification.ensembleIdent.getCaseUuid() ?? "",
                        vectorSpecification.ensembleIdent.getEnsembleName() ?? "",
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency,
                        realizations
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(
                    enabled &&
                    vectorSpecification.vectorName &&
                    vectorSpecification.ensembleIdent.getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getEnsembleName()
                ),
            });
        }

        // Delta Ensemble
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
        return () => ({
            queryKey: [
                "getDeltaEnsembleRealizationsVectorData",
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName(),
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                vectorSpecification.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleRealizationsVectorData(
                    vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                    vectorSpecification.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.YEARLY,
                    realizations
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                resampleFrequency &&
                vectorSpecification.vectorName &&
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName() &&
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName()
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
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        // Regular Ensemble
        if (isEnsembleIdentOfType(item.ensembleIdent, RegularEnsembleIdent)) {
            const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
            const vectorSpecification = {
                ...item,
                ensembleIdent: item.ensembleIdent,
            };
            return () => ({
                queryKey: [
                    "getStatisticalVectorData",
                    vectorSpecification.ensembleIdent.getCaseUuid(),
                    vectorSpecification.ensembleIdent.getEnsembleName(),
                    vectorSpecification.vectorName,
                    resampleFrequency,
                    realizations,
                ],
                queryFn: () =>
                    apiService.timeseries.getStatisticalVectorData(
                        vectorSpecification.ensembleIdent.getCaseUuid() ?? "",
                        vectorSpecification.ensembleIdent.getEnsembleName() ?? "",
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.MONTHLY,
                        undefined,
                        realizations
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(
                    enabled &&
                    vectorSpecification.vectorName &&
                    vectorSpecification.ensembleIdent.getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getEnsembleName()
                ),
            });
        }

        // Delta Ensemble
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
        return () => ({
            queryKey: [
                "getDeltaEnsembleStatisticalVectorData",
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName(),
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                vectorSpecification.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleStatisticalVectorData(
                    vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                    vectorSpecification.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.MONTHLY,
                    undefined,
                    realizations
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                resampleFrequency &&
                vectorSpecification.vectorName &&
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getCompareEnsembleIdent().getEnsembleName() &&
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName()
            ),
        });
    });

    return {
        queries,
    };
});

export const regularEnsembleHistoricalVectorDataQueriesAtom = atomWithQueries((get) => {
    const resampleFrequency = get(resampleFrequencyAtom);
    const regularEnsembleVectorSpecifications = get(regularEnsembleVectorSpecificationsAtom);

    const enabled = regularEnsembleVectorSpecifications.some((elm) => elm.hasHistoricalVector);

    const queries = regularEnsembleVectorSpecifications.map((item) => {
        const vectorSpecification = {
            ...item,
            ensembleIdent: item.ensembleIdent as RegularEnsembleIdent,
        };

        return () => ({
            queryKey: [
                "getHistoricalVectorData",
                vectorSpecification.ensembleIdent.getCaseUuid(),
                vectorSpecification.ensembleIdent.getEnsembleName(),
                vectorSpecification.vectorName,
                resampleFrequency,
            ],
            queryFn: () =>
                apiService.timeseries.getHistoricalVectorData(
                    vectorSpecification.ensembleIdent.getCaseUuid() ?? "",
                    vectorSpecification.ensembleIdent.getEnsembleName() ?? "",
                    vectorSpecification.vectorName ?? "",
                    resampleFrequency ?? Frequency_api.MONTHLY
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                vectorSpecification.vectorName &&
                vectorSpecification.ensembleIdent.getCaseUuid() &&
                vectorSpecification.ensembleIdent.getEnsembleName()
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

    const uniqueEnsembleIdents = [
        ...new Set(
            vectorSpecifications
                ?.filter((item) => item.ensembleIdent instanceof RegularEnsembleIdent)
                .map((item) => item.ensembleIdent as RegularEnsembleIdent) ?? []
        ),
    ];

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
            if (!vectorSpecifications) {
                return { isFetching: false, isError: false, ensembleVectorObservationDataMap: combinedResult };
            }

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
