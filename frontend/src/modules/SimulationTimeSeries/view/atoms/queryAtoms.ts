import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
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

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        if (isEnsembleIdentOfType(item.ensembleIdent, EnsembleIdent)) {
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

        const deltaEnsemble = ensembleSet.findEnsemble(item.ensembleIdent);
        if (!deltaEnsemble) {
            throw new Error(`Delta ensemble not found for: ${item.ensembleIdent.toString()}`);
        }

        const realizations = [...deltaEnsemble.getRealizations()];
        const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
        return () => ({
            queryKey: [
                "getDeltaEnsembleRealizationsVectorData",
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName(),
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName(),
                vectorSpecification.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleRealizationsVectorData(
                    vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName(),
                    vectorSpecification.vectorName ?? "",
                    resampleFrequency,
                    realizations
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                enabled &&
                vectorSpecification.vectorName &&
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName() &&
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName()
            ),
        });
    });

    return {
        queries,
    };
});

export const vectorStatisticsQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled =
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const queries = vectorSpecifications.map((item) => {
        if (isEnsembleIdentOfType(item.ensembleIdent, EnsembleIdent)) {
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

        const deltaEnsemble = ensembleSet.findEnsemble(item.ensembleIdent);
        if (!deltaEnsemble) {
            throw new Error(`Delta ensemble not found for: ${item.ensembleIdent.toString()}`);
        }

        const realizations = [...deltaEnsemble.getRealizations()];
        const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
        return () => ({
            queryKey: [
                "getDeltaEnsembleStatisticalVectorData",
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName(),
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid(),
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName(),
                vectorSpecification.vectorName,
                resampleFrequency,
                realizations,
            ],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleStatisticalVectorData(
                    vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName(),
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
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getFirstEnsembleIdent().getEnsembleName() &&
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getCaseUuid() &&
                vectorSpecification.ensembleIdent.getSecondEnsembleIdent().getEnsembleName()
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

    const regularEnsembleVectorSpecifications = vectorSpecifications.filter((elm) =>
        isEnsembleIdentOfType(elm.ensembleIdent, EnsembleIdent)
    );
    const enabled = regularEnsembleVectorSpecifications.some((elm) => elm.hasHistoricalVector);

    const queries = regularEnsembleVectorSpecifications.map((item) => {
        const vectorSpecification = {
            ...item,
            ensembleIdent: item.ensembleIdent as EnsembleIdent,
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

    // TODO: Should also include the vector specifications used for the queries
    return {
        queries,
        // vectorSpecifications: regularEnsembleVectorSpecifications,
    };
});

export const vectorObservationsQueriesAtom = atomWithQueries((get) => {
    const showObservations = get(showObservationsAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    const uniqueEnsembleIdents = [
        ...new Set(
            vectorSpecifications
                ?.filter((item) => item.ensembleIdent instanceof EnsembleIdent)
                .map((item) => item.ensembleIdent as EnsembleIdent) ?? []
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
