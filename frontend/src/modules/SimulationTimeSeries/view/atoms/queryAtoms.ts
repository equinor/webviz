import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
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
            const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
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
                    realizationsEncodedAsUintListStr,
                ],
                queryFn: () =>
                    apiService.timeseries.getRealizationsVectorData(
                        vectorSpecification.ensembleIdent.getCaseUuid() ?? "",
                        vectorSpecification.ensembleIdent.getEnsembleName() ?? "",
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency,
                        realizationsEncodedAsUintListStr
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
        if (isEnsembleIdentOfType(item.ensembleIdent, DeltaEnsembleIdent)) {
            const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
            const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
            const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
            return () => ({
                queryKey: [
                    "getDeltaEnsembleRealizationsVectorData",
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                    vectorSpecification.vectorName,
                    resampleFrequency,
                    realizationsEncodedAsUintListStr,
                ],
                queryFn: () =>
                    apiService.timeseries.getDeltaEnsembleRealizationsVectorData(
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.YEARLY,
                        realizationsEncodedAsUintListStr
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(
                    enabled &&
                    resampleFrequency &&
                    vectorSpecification.vectorName &&
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName() &&
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName()
                ),
            });
        }

        throw new Error(`Invalid ensemble ident type: ${item.ensembleIdent}`);
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
            const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
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
                    realizationsEncodedAsUintListStr,
                ],
                queryFn: () =>
                    apiService.timeseries.getStatisticalVectorData(
                        vectorSpecification.ensembleIdent.getCaseUuid() ?? "",
                        vectorSpecification.ensembleIdent.getEnsembleName() ?? "",
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.MONTHLY,
                        undefined,
                        realizationsEncodedAsUintListStr
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
        if (isEnsembleIdentOfType(item.ensembleIdent, DeltaEnsembleIdent)) {
            const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
            const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
            const vectorSpecification = { ...item, ensembleIdent: item.ensembleIdent };
            return () => ({
                queryKey: [
                    "getDeltaEnsembleStatisticalVectorData",
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                    vectorSpecification.vectorName,
                    resampleFrequency,
                    realizationsEncodedAsUintListStr,
                ],
                queryFn: () =>
                    apiService.timeseries.getDeltaEnsembleStatisticalVectorData(
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                        vectorSpecification.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.MONTHLY,
                        undefined,
                        realizationsEncodedAsUintListStr
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(
                    enabled &&
                    resampleFrequency &&
                    vectorSpecification.vectorName &&
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName() &&
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName()
                ),
            });
        }
        throw new Error(`Invalid ensemble ident type: ${item.ensembleIdent}`);
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

    const uniqueEnsembleIdents: RegularEnsembleIdent[] = [];
    for (const { ensembleIdent } of vectorSpecifications) {
        const isAlreadyAdded = uniqueEnsembleIdents.some((elm) => elm.equals(ensembleIdent));
        if (!isAlreadyAdded && isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            uniqueEnsembleIdents.push(ensembleIdent);
        }
    }

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
