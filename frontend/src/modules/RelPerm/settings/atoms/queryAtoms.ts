import type { UseQueryResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { Getter } from "jotai";

import {
    getRelpermRealizationDataOptions,
    type getRelpermRealizationDataQueryKey,
    getRelpermTableDefinitionOptions,
    type getRelpermTableDefinitionQueryKey,
    getRelpermTableNamesOptions,
    type getRelpermTableNamesQueryKey,
    type HTTPValidationError_api,
    type RelpermRealizationDataResponse_api,
    type RelpermTableDefinition_api,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import type { RelPermDataAccessorStatus, RelPermEnsembleRealizationData } from "../../typesAndEnums";
import { RelPermDataAccessor } from "../../utils/RelPermDataAccessor";

import { validRealizationNumbersAtom } from "./baseAtoms";
import {
    selectedCurveNamesAtom,
    selectedEnsembleIdentsAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./derivedAtoms";

type RelPermApiError = AxiosError<HTTPValidationError_api>;
type RelPermTableNamesQueryKey = ReturnType<typeof getRelpermTableNamesQueryKey>;
type RelPermTableDefinitionQueryKey = ReturnType<typeof getRelpermTableDefinitionQueryKey>;
type RelPermRealizationDataQueryKey = ReturnType<typeof getRelpermRealizationDataQueryKey>;
type RelPermRealizationDataQueryContext = {
    ensembleIdent: RegularEnsembleIdent;
    filteredRealizations: number[] | null;
    tableDefinitionIsLoaded: boolean;
};

export const relPermTableNamesQueriesAtom = atomWithQueries<
    string[],
    RelPermApiError,
    string[],
    RelPermTableNamesQueryKey
>(makeRelPermTableNamesQueryOptions);

export const relPermTableDefinitionQueriesAtom = atomWithQueries<
    RelpermTableDefinition_api,
    RelPermApiError,
    RelpermTableDefinition_api,
    RelPermTableDefinitionQueryKey
>(makeRelPermTableDefinitionQueryOptions);

export const relPermRealizationDataQueriesAtom = atomWithQueries<
    RelpermRealizationDataResponse_api,
    RelPermApiError,
    RelpermRealizationDataResponse_api,
    RelPermRealizationDataQueryKey,
    RelPermDataAccessorStatus
>(makeRelPermRealizationDataQueryOptions);

function makeRelPermTableNamesQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return {
        queries: selectedEnsembleIdents.map(function makeRelPermTableNamesQuery(ensembleIdent) {
            const options = getRelpermTableNamesOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRelPermTableNamesQueryOptions() {
                return { ...options, enabled: Boolean(ensembleIdent) };
            };
        }),
    };
}

function makeRelPermTableDefinitionQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableName = get(selectedTableNameAtom);

    return {
        queries: selectedEnsembleIdents.map(function makeRelPermTableDefinitionQuery(ensembleIdent) {
            const options = getRelpermTableDefinitionOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    table_name: selectedTableName ?? "",
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRelPermTableDefinitionQueryOptions() {
                return { ...options, enabled: Boolean(selectedTableName) };
            };
        }),
    };
}

function makeRelPermRealizationDataQueryOptions(get: Getter) {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableName = get(selectedTableNameAtom);
    const selectedSaturationAxisName = get(selectedSaturationAxisNameAtom);
    const selectedCurveNames = get(selectedCurveNamesAtom);
    const selectedSatnums = get(selectedSatnumsAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);
    const tableDefinitionQueries = get(relPermTableDefinitionQueriesAtom);

    function makeQueryContext(ensembleIdent: RegularEnsembleIdent, index: number): RelPermRealizationDataQueryContext {
        const tableRealizations = tableDefinitionQueries[index]?.data?.realizations ?? [];
        const filteredRealizations = filterRealizationsByTable(validRealizationNumbers, tableRealizations);

        return {
            ensembleIdent,
            filteredRealizations,
            tableDefinitionIsLoaded: Boolean(tableDefinitionQueries[index]?.data),
        };
    }

    const queryContexts = selectedEnsembleIdents.map(makeQueryContext);

    return {
        queries: queryContexts.map(function makeRelPermRealizationDataQuery({
            ensembleIdent,
            filteredRealizations,
            tableDefinitionIsLoaded,
        }) {
            const realizationsEncodedAsUintListStr = filteredRealizations
                ? encodeAsUintListStr(filteredRealizations)
                : null;
            const options = getRelpermRealizationDataOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    table_name: selectedTableName ?? "",
                    saturation_axis_name: selectedSaturationAxisName ?? "",
                    curve_names: selectedCurveNames,
                    satnums: selectedSatnums,
                    realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return function getRelPermRealizationDataQueryOptions() {
                return {
                    ...options,
                    enabled: Boolean(
                        selectedTableName &&
                        selectedSaturationAxisName &&
                        selectedCurveNames.length > 0 &&
                        selectedSatnums.length > 0 &&
                        tableDefinitionIsLoaded &&
                        (filteredRealizations === null || filteredRealizations.length > 0),
                    ),
                };
            };
        }),
        combine: function combineRelPermRealizationDataQueryResults(
            results: UseQueryResult<RelpermRealizationDataResponse_api, RelPermApiError>[],
        ): RelPermDataAccessorStatus {
            const ensembleData: RelPermEnsembleRealizationData[] = [];

            results.forEach(function collectEnsembleData(result, index) {
                const data = result.data;
                if (!data) {
                    return;
                }
                ensembleData.push({ ensembleIdent: queryContexts[index].ensembleIdent, data });
            });

            return {
                dataAccessor: ensembleData.length > 0 ? new RelPermDataAccessor(ensembleData) : null,
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
                    .filter(function isNonNullError(error) {
                        return error !== null;
                    }) as Error[],
            };
        },
    };
}

function filterRealizationsByTable(
    validRealizationNumbers: number[] | null,
    tableRealizations: number[],
): number[] | null {
    if (!validRealizationNumbers) {
        return null;
    }

    const tableRealizationSet = new Set(tableRealizations);
    return validRealizationNumbers.filter(function isRealizationInTable(realization) {
        return tableRealizationSet.has(realization);
    });
}
