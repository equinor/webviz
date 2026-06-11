import type { UseQueryResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { Getter } from "jotai";

import {
    getRftObservationsOptions,
    type getRftObservationsQueryKey,
    getRftRealizationDataOptions,
    type getRftRealizationDataQueryKey,
    getRftTableDefinitionOptions,
    type getRftTableDefinitionQueryKey,
    type HTTPValidationError_api,
    type RftObservations_api,
    type RftRealizationData_api,
    type RftTableDefinition_api,
} from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import type {
    RftDataAccessorStatus,
    RftEnsembleObservationsData,
    RftEnsembleRealizationData,
    RftObservationsStatus,
} from "../../typesAndEnums";
import { RftDataAccessor } from "../../utils/RftDataAccessor";

import { validRealizationNumbersAtom } from "./baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./derivedAtoms";

type RftApiError = AxiosError<HTTPValidationError_api>;
type RftTableDefinitionQueryKey = ReturnType<typeof getRftTableDefinitionQueryKey>;
type RftRealizationDataQueryKey = ReturnType<typeof getRftRealizationDataQueryKey>;
type RftObservationsQueryKey = ReturnType<typeof getRftObservationsQueryKey>;

export const rftTableDefinitionQueriesAtom = atomWithQueries<
    RftTableDefinition_api,
    RftApiError,
    RftTableDefinition_api,
    RftTableDefinitionQueryKey
>(makeRftTableDefinitionQueryOptions);

export const rftRealizationDataQueriesAtom = atomWithQueries<
    RftRealizationData_api[],
    RftApiError,
    RftRealizationData_api[],
    RftRealizationDataQueryKey,
    RftDataAccessorStatus
>(makeRftRealizationDataQueryOptions);

export const rftObservationsQueriesAtom = atomWithQueries<
    RftObservations_api[],
    RftApiError,
    RftObservations_api[],
    RftObservationsQueryKey,
    RftObservationsStatus
>(makeRftObservationsQueryOptions);

function makeRftTableDefinitionQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return {
        queries: selectedEnsembleIdents.map(function makeRftTableDefinitionQuery(ensembleIdent) {
            const options = getRftTableDefinitionOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRftTableDefinitionQueryOptions() {
                return { ...options, enabled: Boolean(ensembleIdent) };
            };
        }),
    };
}

function makeRftRealizationDataQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedWellName = get(selectedWellNameAtom);
    const selectedResponseName = get(selectedResponseNameAtom);
    const selectedTimestampUtcMs = get(selectedTimestampUtcMsAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    const realizationsEncodedAsUintListStr = validRealizationNumbers
        ? encodeAsUintListStr(validRealizationNumbers)
        : null;

    return {
        queries: selectedEnsembleIdents.map(function makeRftRealizationDataQuery(ensembleIdent) {
            const options = getRftRealizationDataOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    well_name: selectedWellName ?? "",
                    response_name: selectedResponseName ?? "",
                    timestamps_utc_ms: selectedTimestampUtcMs !== null ? [selectedTimestampUtcMs] : null,
                    realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRftRealizationDataQueryOptions() {
                return {
                    ...options,
                    enabled: Boolean(selectedWellName && selectedResponseName && selectedTimestampUtcMs !== null),
                };
            };
        }),
        combine: function combineRftRealizationDataQueryResults(
            results: UseQueryResult<RftRealizationData_api[], RftApiError>[],
        ): RftDataAccessorStatus {
            const ensembleData: RftEnsembleRealizationData[] = [];

            results.forEach(function collectEnsembleData(result, index) {
                const data = result.data;
                if (!data) {
                    return;
                }
                ensembleData.push({ ensembleIdent: selectedEnsembleIdents[index], data });
            });

            return {
                dataAccessor: ensembleData.length > 0 ? new RftDataAccessor(ensembleData) : null,
                isFetching: results.some(function isResultFetching(result) {
                    return result.isFetching;
                }),
                isError: results.some(function isResultError(result) {
                    return result.isError;
                }),
                errors: results
                    .map(function getResultError(result) {
                        return result.error;
                    })
                    .filter(function isNonNullError(error): error is RftApiError {
                        return error !== null;
                    }),
            };
        },
    };
}

function makeRftObservationsQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return {
        queries: selectedEnsembleIdents.map(function makeRftObservationsQuery(ensembleIdent) {
            const options = getRftObservationsOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRftObservationsQueryOptions() {
                return { ...options, enabled: Boolean(ensembleIdent) };
            };
        }),
        combine: function combineRftObservationsQueryResults(
            results: UseQueryResult<RftObservations_api[], RftApiError>[],
        ): RftObservationsStatus {
            const observationsData: RftEnsembleObservationsData[] = [];

            results.forEach(function collectObservationsData(result, index) {
                const data = result.data;
                if (!data) {
                    return;
                }
                observationsData.push({ ensembleIdent: selectedEnsembleIdents[index], observations: data });
            });

            return {
                observationsData,
                isFetching: results.some(function isResultFetching(result) {
                    return result.isFetching;
                }),
                isError: results.some(function isResultError(result) {
                    return result.isError;
                }),
                errors: results
                    .map(function getResultError(result) {
                        return result.error;
                    })
                    .filter(function isNonNullError(error): error is RftApiError {
                        return error !== null;
                    }),
            };
        },
    };
}
