import type { QueryObserverResult } from "@tanstack/react-query";

import type { Observations_api, VectorHistoricalData_api } from "@api";
import {
    Frequency_api,
    getDeltaEnsembleRealizationsVectorDataOptions,
    getDeltaEnsembleStatisticalVectorDataOptions,
    getHistoricalVectorDataOptions,
    getObservationsOptions,
    getRealizationsVectorDataOptions,
    getStatisticalVectorDataOptions,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import type {
    EnsembleVectorObservationDataMap,
    VectorSpec,
    VectorWithHistoricalData,
} from "@modules/SimulationTimeSeries/typesAndEnums";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

import {
    resampleFrequencyAtom,
    showHistoricalAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import { atom } from "jotai";

// ----------------------------------------------------

export const vectorDataQueriesAtom = atom((get) => {
    const regularQueries = get(regularEnsembleVectorDataQueriesAtom);
    const deltaQueries = get(deltaEnsembleVectorDataQueriesAtom);

    return [...regularQueries, ...deltaQueries];
});

const regularEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isEnabledForQueryType(visualizationMode, QueryType.VECTOR_DATA);

    const queries = regularEnsembleVectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        const [ensembleIdent, vectorName] = [item.ensembleIdent, item.vectorName];

        const options = getRealizationsVectorDataOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                vector_name: vectorName,
                // Having no default value but not contributing to enabled flag? Discuss intended logic here.
                resampling_frequency: resampleFrequency,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                enabled &&
                    resampleFrequency &&
                    vectorName &&
                    ensembleIdent.getCaseUuid() &&
                    ensembleIdent.getEnsembleName(),
            ),
        });
    });

    return {
        queries,
    };
});

const deltaEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const { deltaEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isEnabledForQueryType(visualizationMode, QueryType.VECTOR_DATA);

    const queries = deltaEnsembleVectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        const comparisonEnsembleIdent = item.ensembleIdent.getComparisonEnsembleIdent();
        const referenceEnsembleIdent = item.ensembleIdent.getReferenceEnsembleIdent();
        const vectorName = item.vectorName;

        const options = getDeltaEnsembleRealizationsVectorDataOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent.getCaseUuid(),
                comparison_ensemble_name: comparisonEnsembleIdent.getEnsembleName(),
                reference_case_uuid: referenceEnsembleIdent.getCaseUuid(),
                reference_ensemble_name: referenceEnsembleIdent.getEnsembleName(),
                vector_name: vectorName,
                // Having a default value but contributing to enabled flag? Discuss intended logic here.
                resampling_frequency: resampleFrequency ?? Frequency_api.YEARLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                enabled &&
                    resampleFrequency &&
                    vectorName &&
                    comparisonEnsembleIdent.getCaseUuid() &&
                    comparisonEnsembleIdent.getEnsembleName() &&
                    referenceEnsembleIdent.getCaseUuid() &&
                    referenceEnsembleIdent.getEnsembleName(),
            ),
        });
    });

    return {
        queries,
    };
});

// ----------------------------------------------------

export const vectorStatisticsQueriesAtom = atom((get) => {
    const regularQueries = get(regularEnsembleStatisticsQueriesAtom);
    const deltaQueries = get(deltaEnsembleStatisticsQueriesAtom);

    return [...regularQueries, ...deltaQueries];
});

const regularEnsembleStatisticsQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isEnabledForQueryType(visualizationMode, QueryType.VECTOR_STATISTICS);

    const queries = regularEnsembleVectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        const [ensembleIdent, vectorName] = [item.ensembleIdent, item.vectorName];

        const options = getStatisticalVectorDataOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                vector_name: vectorName,
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                enabled &&
                    resampleFrequency &&
                    vectorName &&
                    ensembleIdent.getCaseUuid() &&
                    ensembleIdent.getEnsembleName(),
            ),
        });
    });

    return {
        queries,
    };
});

const deltaEnsembleStatisticsQueriesAtom = atomWithQueries((get) => {
    const { deltaEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isEnabledForQueryType(visualizationMode, QueryType.VECTOR_STATISTICS);

    const queries = deltaEnsembleVectorSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        const comparisonEnsembleIdent = item.ensembleIdent.getComparisonEnsembleIdent();
        const referenceEnsembleIdent = item.ensembleIdent.getReferenceEnsembleIdent();
        const vectorName = item.vectorName;

        const options = getDeltaEnsembleStatisticalVectorDataOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent.getCaseUuid(),
                comparison_ensemble_name: comparisonEnsembleIdent.getEnsembleName(),
                reference_case_uuid: referenceEnsembleIdent.getCaseUuid(),
                reference_ensemble_name: referenceEnsembleIdent.getEnsembleName(),
                vector_name: vectorName,
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                enabled &&
                    resampleFrequency &&
                    vectorName &&
                    comparisonEnsembleIdent.getCaseUuid() &&
                    comparisonEnsembleIdent.getEnsembleName() &&
                    referenceEnsembleIdent.getCaseUuid() &&
                    referenceEnsembleIdent.getEnsembleName(),
            ),
        });
    });

    return {
        queries,
    };
});

// ----------------------------------------------------

/**
 * Create an array of object with vector specification and its historical vector data
 *
 * As not all vector specifications have historical vectors, we create an array of object with
 * vector specification and its historical vectors data, for each vector specification that has historical vectors.
 */
export const regularEnsembleHistoricalVectorDataQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const showHistorical = get(showHistoricalAtom);
    const resampleFrequency = get(resampleFrequencyAtom);

    const vectorSpecificationsWithHistorical: RegularEnsembleVectorSpec[] = [];

    const queries: (() => ReturnType<typeof getHistoricalVectorDataOptions> & { enabled: boolean })[] = [];
    for (const vectorSpec of regularEnsembleVectorSpecifications) {
        if (!vectorSpec.hasHistoricalVector) {
            continue;
        }

        vectorSpecificationsWithHistorical.push({ ...vectorSpec });

        const [ensembleIdent, vectorName] = [vectorSpec.ensembleIdent as RegularEnsembleIdent, vectorSpec.vectorName];

        const options = getHistoricalVectorDataOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                non_historical_vector_name: vectorName,
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        queries.push(() => ({
            ...options,
            enabled: Boolean(
                showHistorical && vectorName && ensembleIdent.getCaseUuid() && ensembleIdent.getEnsembleName(),
            ),
        }));
    }

    return {
        queries,
        combine: (results: QueryObserverResult<VectorHistoricalData_api>[]) => {
            const vectorsWithHistoricalData: VectorWithHistoricalData[] = [];
            // What's the point of this line? Boolean([]) == true, so this check is useless.
            /*
            if (!vectorSpecificationsWithHistorical) {
                return { isFetching: false, isError: false, vectorsWithHistoricalData };
            }
            */

            results.forEach((result, index) => {
                const vectorSpecification = vectorSpecificationsWithHistorical.at(index);
                if (!vectorSpecification || !result.data) {
                    return;
                }

                vectorsWithHistoricalData.push({
                    vectorSpecification,
                    data: result.data,
                });
            });

            return {
                isFetching: results.some((result) => result.isFetching),
                isError: results.some((result) => result.isError),
                vectorsWithHistoricalData,
                errors: results.filter((result) => result.isError).map((result) => result.error),
            };
        },
    };
});

/**
 * Create map of ensemble ident and its observation data per vector
 *
 * As observations are provided per ensemble, we must retrieve ensemble observations and look for the
 * selected vector specifications among the observations data. If selected vector specification is among the
 * observations, we add it to a map for vector and observations data for respective ensemble ident.
 */
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
        const options = getObservationsOptions({
            query: {
                case_uuid: item.getCaseUuid(),
                ...makeCacheBustingQueryParam(item),
            },
        });
        return () => ({
            ...options,
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
                errors: results.filter((result) => result.isError).map((result) => result.error),
            };
        },
    };
});

type RegularEnsembleVectorSpec = Omit<VectorSpec, "ensembleIdent"> & { ensembleIdent: RegularEnsembleIdent };
type DeltaEnsembleVectorSpec = Omit<VectorSpec, "ensembleIdent"> & { ensembleIdent: DeltaEnsembleIdent };

const categorizedVectorSpecificationsAtom = atom((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);

    const regularEnsembleVectorSpecifications: RegularEnsembleVectorSpec[] = [];
    const deltaEnsembleVectorSpecifications: DeltaEnsembleVectorSpec[] = [];

    for (const vectorSpecification of vectorSpecifications) {
        if (isEnsembleIdentOfType(vectorSpecification.ensembleIdent, RegularEnsembleIdent)) {
            const ensembleIdent = vectorSpecification.ensembleIdent;
            regularEnsembleVectorSpecifications.push({ ...vectorSpecification, ensembleIdent });
        } else if (isEnsembleIdentOfType(vectorSpecification.ensembleIdent, DeltaEnsembleIdent)) {
            const ensembleIdent = vectorSpecification.ensembleIdent;
            deltaEnsembleVectorSpecifications.push({ ...vectorSpecification, ensembleIdent });
        } else {
            throw new Error(`Invalid ensemble ident type: ${vectorSpecification.ensembleIdent}`);
        }
    }

    return {
        regularEnsembleVectorSpecifications,
        deltaEnsembleVectorSpecifications,
    };
});

enum QueryType {
    VECTOR_DATA = "VECTOR_DATA",
    VECTOR_STATISTICS = "VECTOR_STATISTICS",
    HISTORICAL_VECTOR_DATA = "HISTORICAL_VECTOR_DATA",
    VECTOR_OBSERVATIONS = "VECTOR_OBSERVATIONS",
}

function isEnabledForQueryType(visualizationMode: VisualizationMode, queryType: QueryType): boolean {
    switch (queryType) {
        case QueryType.VECTOR_DATA:
            return (
                visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
                visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            );
        case QueryType.VECTOR_STATISTICS:
            return (
                visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
                visualizationMode === VisualizationMode.STATISTICAL_LINES ||
                visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            );
        case QueryType.HISTORICAL_VECTOR_DATA:
            return true; // Controlled by showHistoricalAtom
        case QueryType.VECTOR_OBSERVATIONS:
            return true; // Controlled by showObservationsAtom
        default:
            return false;
    }
}
