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
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;

    const queries = selectedEnsembleIdents.map(function makeRftTableDefinitionQuery(ensembleIdent) {
        const options = getRftTableDefinitionOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return function getRftTableDefinitionQueryOptions() {
            return options;
        };
    });

    return { queries };
});

export const rftRealizationDataQueriesAtom = atomWithQueries(function makeRftRealizationDataQueryOptions(get) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const selectedWellName = get(selectedWellNameAtom).value;
    const selectedResponseName = get(selectedResponseNameAtom).value;
    const selectedTimestampUtcMs = get(selectedTimestampUtcMsAtom).value;
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    const realizationsEncodedAsUintListStr =
        validRealizationNumbers.length > 0 ? encodeAsUintListStr(validRealizationNumbers) : null;

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
                enabled: Boolean(selectedWellName && selectedResponseName && selectedTimestampUtcMs !== null),
            };
        };
    });

    function combine(results: UseQueryResult<RftRealizationData_api[], RftApiError>[]): RftRealizationDataResult {
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
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;

    const queries = selectedEnsembleIdents.map(function makeRftObservationsQuery(ensembleIdent) {
        const options = getRftObservationsOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });

        return function getRftObservationsQueryOptions() {
            return options;
        };
    });

    function combine(results: UseQueryResult<RftObservations_api[], RftApiError>[]): RftObservationsResult {
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
