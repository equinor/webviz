import type { QueryObserverResult } from "@tanstack/react-query";
import { atom } from "jotai";

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
    CategorizedItem,
    EnsembleVectorObservationDataMap,
    VectorSpec,
    VectorWithHistoricalData,
} from "@modules/SimulationTimeSeries/typesAndEnums";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";
import { assembleQueryResultsInOriginalOrder } from "@modules/SimulationTimeSeries/utils/querySortingUtils";

import {
    resampleFrequencyAtom,
    showHistoricalAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";

export const vectorDataQueriesAtom = atom((get) => {
    const { regularEnsembleVectorSpecifications, deltaEnsembleVectorSpecifications } = get(
        categorizedVectorSpecificationsAtom,
    );
    const regularQueries = get(regularEnsembleVectorDataQueriesAtom);
    const deltaQueries = get(deltaEnsembleVectorDataQueriesAtom);

    return assembleQueryResultsInOriginalOrder(
        regularQueries,
        deltaQueries,
        regularEnsembleVectorSpecifications,
        deltaEnsembleVectorSpecifications,
    );
});

export const vectorStatisticsQueriesAtom = atom((get) => {
    const { regularEnsembleVectorSpecifications, deltaEnsembleVectorSpecifications } = get(
        categorizedVectorSpecificationsAtom,
    );
    const regularQueries = get(regularEnsembleStatisticsQueriesAtom);
    const deltaQueries = get(deltaEnsembleStatisticsQueriesAtom);

    return assembleQueryResultsInOriginalOrder(
        regularQueries,
        deltaQueries,
        regularEnsembleVectorSpecifications,
        deltaEnsembleVectorSpecifications,
    );
});

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

    // Vector specifications for Regular Ensemble that have historical vectors
    const vectorSpecificationsWithHistorical = regularEnsembleVectorSpecifications.filter(
        (elm) => elm.item.hasHistoricalVector,
    );

    const queries = vectorSpecificationsWithHistorical.map(({ item }) => {
        const options = getHistoricalVectorDataOptions({
            query: {
                case_uuid: item.ensembleIdent.getCaseUuid(),
                ensemble_name: item.ensembleIdent.getEnsembleName(),
                non_historical_vector_name: item.vectorName,
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                ...makeCacheBustingQueryParam(item.ensembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                showHistorical &&
                    item.vectorName &&
                    item.ensembleIdent.getCaseUuid() &&
                    item.ensembleIdent.getEnsembleName(),
            ),
        });
    });

    return {
        queries,
        combine: (results: QueryObserverResult<VectorHistoricalData_api>[]) => {
            const vectorsWithHistoricalData: VectorWithHistoricalData[] = [];

            results.forEach((result, index) => {
                const vectorSpecificationItem = vectorSpecificationsWithHistorical.at(index);
                if (!vectorSpecificationItem || !result.data) {
                    return;
                }

                vectorsWithHistoricalData.push({
                    vectorSpecification: vectorSpecificationItem.item,
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

// ----------------------------------------------------

function isVectorDataQueryEnabled(visualizationMode: VisualizationMode): boolean {
    return (
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
    );
}

function isDeltaEnsembleQueryEnabled(resampleFrequency: Frequency_api | null): boolean {
    return resampleFrequency !== null;
}

const regularEnsembleVectorDataQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isVectorDataQueryEnabled(visualizationMode);

    const queries = regularEnsembleVectorSpecifications.map(({ item }) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        const [ensembleIdent, vectorName] = [item.ensembleIdent, item.vectorName];

        const options = getRealizationsVectorDataOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                vector_name: vectorName,
                resampling_frequency: resampleFrequency,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(enabled && vectorName && ensembleIdent.getCaseUuid() && ensembleIdent.getEnsembleName()),
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

    const enabled = isVectorDataQueryEnabled(visualizationMode) && isDeltaEnsembleQueryEnabled(resampleFrequency);

    const queries = deltaEnsembleVectorSpecifications.map(({ item }) => {
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
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => ({
            ...options,
            enabled: Boolean(
                enabled &&
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

function isStatisticsQueryEnabled(
    visualizationMode: VisualizationMode,
    resampleFrequency: Frequency_api | null,
): boolean {
    return (
        resampleFrequency !== null &&
        (visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
            visualizationMode === VisualizationMode.STATISTICAL_LINES ||
            visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS)
    );
}

const regularEnsembleStatisticsQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleVectorSpecifications } = get(categorizedVectorSpecificationsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const visualizationMode = get(visualizationModeAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const enabled = isStatisticsQueryEnabled(visualizationMode, resampleFrequency);

    const queries = regularEnsembleVectorSpecifications.map(({ item }) => {
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
            enabled: Boolean(enabled && vectorName && ensembleIdent.getCaseUuid() && ensembleIdent.getEnsembleName()),
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

    const enabled =
        isStatisticsQueryEnabled(visualizationMode, resampleFrequency) &&
        isDeltaEnsembleQueryEnabled(resampleFrequency);

    const queries = deltaEnsembleVectorSpecifications.map(({ item }) => {
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

type RegularEnsembleVectorSpec = Omit<VectorSpec, "ensembleIdent"> & { ensembleIdent: RegularEnsembleIdent };
type DeltaEnsembleVectorSpec = Omit<VectorSpec, "ensembleIdent"> & { ensembleIdent: DeltaEnsembleIdent };

const categorizedVectorSpecificationsAtom = atom((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);

    // Categorized vector specifications
    const regularEnsembleVectorSpecifications: CategorizedItem<RegularEnsembleVectorSpec>[] = [];
    const deltaEnsembleVectorSpecifications: CategorizedItem<DeltaEnsembleVectorSpec>[] = [];

    vectorSpecifications.forEach((vectorSpecification, originalIndex) => {
        if (isEnsembleIdentOfType(vectorSpecification.ensembleIdent, RegularEnsembleIdent)) {
            const ensembleIdent = vectorSpecification.ensembleIdent;
            regularEnsembleVectorSpecifications.push({
                item: { ...vectorSpecification, ensembleIdent },
                originalIndex,
            });
        } else if (isEnsembleIdentOfType(vectorSpecification.ensembleIdent, DeltaEnsembleIdent)) {
            const ensembleIdent = vectorSpecification.ensembleIdent;
            deltaEnsembleVectorSpecifications.push({
                item: { ...vectorSpecification, ensembleIdent },
                originalIndex,
            });
        } else {
            throw new Error(`Invalid ensemble ident type: ${vectorSpecification.ensembleIdent}`);
        }
    });

    return {
        regularEnsembleVectorSpecifications,
        deltaEnsembleVectorSpecifications,
    };
});
