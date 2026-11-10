import type { UseQueryResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import {
    getRftObservationsOptions,
    getRftRealizationDataOptions,
    getRftTableDefinitionOptions,
    type HTTPValidationError_api,
    type RftObservations_api,
    type RftRealizationData_api,
} from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import type {
    RftEnsembleObservationsData,
    RftEnsembleRealizationData,
    RftObservationsResult,
    RftRealizationDataResult,
} from "../../typesAndEnums";
import { RftDataAccessor } from "../../utils/RftDataAccessor";

import { validRealizationNumbersAtom } from "./derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./persistableFixableAtoms";

type RftApiError = AxiosError<HTTPValidationError_api>;

export const rftTableDefinitionQueriesAtom = atomWithQueries(function makeRftTableDefinitionQueryOptions(get) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map(function makeRftTableDefinitionQuery(ensembleIdent) {
        const options = getRftTableDefinitionOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return function getRftTableDefinitionQueryOptions() {
            return { ...options, enabled: ensembleIdentsValid };
        };
    });

    return { queries };
});

export const rftRealizationDataQueriesAtom = atomWithQueries(function makeRftRealizationDataQueryOptions(get) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);
    const { value: selectedWellName, isValidInContext: wellNameValid } = get(selectedWellNameAtom);
    const { value: selectedResponseName, isValidInContext: responseNameValid } = get(selectedResponseNameAtom);
    const { value: selectedTimestampUtcMs, isValidInContext: timestampValid } = get(selectedTimestampUtcMsAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    const realizationsEncodedAsUintListStr =
        validRealizationNumbers.length > 0 ? encodeAsUintListStr(validRealizationNumbers) : null;
    const areSelectionsValid = ensembleIdentsValid && wellNameValid && responseNameValid && timestampValid;

    const queries = selectedEnsembleIdents.map(function makeRftRealizationDataQuery(ensembleIdent) {
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
                enabled: Boolean(
                    selectedWellName && selectedResponseName && selectedTimestampUtcMs !== null && areSelectionsValid,
                ),
            };
        };
    });

    function combine(results: UseQueryResult<RftRealizationData_api[], RftApiError>[]): RftRealizationDataResult {
        // A disabled query keeps its cached data and error, which must not be exposed for an invalid selection
        // (e.g. a removed ensemble whose query key is still cached)
        if (!areSelectionsValid) {
            return { dataAccessor: null, isFetching: false, isError: false, errors: [] };
        }

        const ensembleData: RftEnsembleRealizationData[] = [];

        results.forEach(function collectEnsembleData(result, index) {
            if (!result.data) {
                return;
            }
            ensembleData.push({ ensembleIdent: selectedEnsembleIdents[index], data: result.data });
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
    }

    return { queries, combine };
});

export const rftObservationsQueriesAtom = atomWithQueries(function makeRftObservationsQueryOptions(get) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map(function makeRftObservationsQuery(ensembleIdent) {
        const options = getRftObservationsOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return function getRftObservationsQueryOptions() {
            return { ...options, enabled: ensembleIdentsValid };
        };
    });

    function combine(results: UseQueryResult<RftObservations_api[], RftApiError>[]): RftObservationsResult {
        // Like the realization data, cached observations must not be exposed for an invalid ensemble selection
        if (!ensembleIdentsValid) {
            return { observationsData: [], isFetching: false, isError: false, errors: [] };
        }

        const observationsData: RftEnsembleObservationsData[] = [];

        results.forEach(function collectObservationsData(result, index) {
            if (!result.data) {
                return;
            }
            observationsData.push({ ensembleIdent: selectedEnsembleIdents[index], observations: result.data });
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
    }

    return { queries, combine };
});
