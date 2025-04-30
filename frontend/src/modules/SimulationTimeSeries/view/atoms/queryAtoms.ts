import type { QueryObserverResult } from "@tanstack/react-query";

import type { Observations_api } from "@api";
import {
    Frequency_api,
    getDeltaEnsembleRealizationsVectorData,
    getDeltaEnsembleStatisticalVectorData,
    getHistoricalVectorData,
    getObservations,
    getRealizationsVectorData,
    getStatisticalVectorData,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import type { EnsembleVectorObservationDataMap } from "@modules/SimulationTimeSeries/typesAndEnums";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

import {
    resampleFrequencyAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import { regularEnsembleVectorSpecificationsAtom } from "./derivedAtoms";

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
                queryFn: async () => {
                    const { data } = await getRealizationsVectorData({
                        query: {
                            case_uuid: vectorSpecification.ensembleIdent.getCaseUuid(),
                            ensemble_name: vectorSpecification.ensembleIdent.getEnsembleName(),
                            vector_name: vectorSpecification.vectorName,
                            resampling_frequency: resampleFrequency,
                            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
                enabled: Boolean(
                    enabled &&
                        vectorSpecification.vectorName &&
                        vectorSpecification.ensembleIdent.getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getEnsembleName(),
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
                queryFn: async () => {
                    const { data } = await getDeltaEnsembleRealizationsVectorData({
                        query: {
                            comparison_case_uuid: vectorSpecification.ensembleIdent
                                .getComparisonEnsembleIdent()
                                .getCaseUuid(),
                            comparison_ensemble_name: vectorSpecification.ensembleIdent
                                .getComparisonEnsembleIdent()
                                .getEnsembleName(),
                            reference_case_uuid: vectorSpecification.ensembleIdent
                                .getReferenceEnsembleIdent()
                                .getCaseUuid(),
                            reference_ensemble_name: vectorSpecification.ensembleIdent
                                .getReferenceEnsembleIdent()
                                .getEnsembleName(),
                            vector_name: vectorSpecification.vectorName,
                            resampling_frequency: resampleFrequency ?? Frequency_api.YEARLY,
                            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
                enabled: Boolean(
                    enabled &&
                        resampleFrequency &&
                        vectorSpecification.vectorName &&
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName() &&
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
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
                queryFn: async () => {
                    const { data } = await getStatisticalVectorData({
                        query: {
                            case_uuid: vectorSpecification.ensembleIdent.getCaseUuid(),
                            ensemble_name: vectorSpecification.ensembleIdent.getEnsembleName(),
                            vector_name: vectorSpecification.vectorName,
                            resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
                enabled: Boolean(
                    enabled &&
                        vectorSpecification.vectorName &&
                        vectorSpecification.ensembleIdent.getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getEnsembleName(),
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
                queryFn: async () => {
                    const { data } = await getDeltaEnsembleStatisticalVectorData({
                        query: {
                            comparison_case_uuid: vectorSpecification.ensembleIdent
                                .getComparisonEnsembleIdent()
                                .getCaseUuid(),
                            comparison_ensemble_name: vectorSpecification.ensembleIdent
                                .getComparisonEnsembleIdent()
                                .getEnsembleName(),
                            reference_case_uuid: vectorSpecification.ensembleIdent
                                .getReferenceEnsembleIdent()
                                .getCaseUuid(),
                            reference_ensemble_name: vectorSpecification.ensembleIdent
                                .getReferenceEnsembleIdent()
                                .getEnsembleName(),
                            vector_name: vectorSpecification.vectorName,
                            resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
                enabled: Boolean(
                    enabled &&
                        resampleFrequency &&
                        vectorSpecification.vectorName &&
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName() &&
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getCaseUuid() &&
                        vectorSpecification.ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
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
            queryFn: async () => {
                const { data } = await getHistoricalVectorData({
                    query: {
                        case_uuid: vectorSpecification.ensembleIdent.getCaseUuid(),
                        ensemble_name: vectorSpecification.ensembleIdent.getEnsembleName(),
                        non_historical_vector_name: vectorSpecification.vectorName,
                        resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                    },
                    throwOnError: true,
                });

                return data;
            },
            enabled: Boolean(
                enabled &&
                    vectorSpecification.vectorName &&
                    vectorSpecification.ensembleIdent.getCaseUuid() &&
                    vectorSpecification.ensembleIdent.getEnsembleName(),
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
            queryFn: async () => {
                const { data } = await getObservations({
                    query: { case_uuid: item.getCaseUuid() },
                    throwOnError: true,
                });
                return data;
            },
            enabled: Boolean(showObservations && item.getCaseUuid()),
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
                    (item) => item.ensembleIdent === ensembleIdent,
                );

                const summary = result.data?.summary ?? [];
                const ensembleHasObservations = summary.length !== 0;
                combinedResult.set(ensembleIdent, {
                    hasSummaryObservations: ensembleHasObservations,
                    vectorsObservationData: [],
                });
                for (const vectorSpec of ensembleVectorSpecifications) {
                    const vectorObservationsData =
                        summary.find((elm) => elm.vector_name === vectorSpec.vectorName) ?? null;
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
