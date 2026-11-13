import type { UseQueryResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { Getter } from "jotai";

import {
    getRelpermRealizationData,
    getRelpermRealizationDataOptions,
    type getRelpermRealizationDataQueryKey,
    getRelpermTableDefinitionOptions,
    type getRelpermTableDefinitionQueryKey,
    getRelpermTableNamesOptions,
    type getRelpermTableNamesQueryKey,
    type HTTPValidationError_api,
    type RelpermRealizationDataResponse_api,
    type RelpermTableDefinition_api,
    withWarnings,
    type ResultWithWarnings,
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
} from "./persistableFixableAtoms";

type RelPermApiError = AxiosError<HTTPValidationError_api>;
type RelPermTableNamesQueryKey = ReturnType<typeof getRelpermTableNamesQueryKey>;
type RelPermTableDefinitionQueryKey = ReturnType<typeof getRelpermTableDefinitionQueryKey>;
type RelPermRealizationDataQueryKey = ReturnType<typeof getRelpermRealizationDataQueryKey>;
type RelPermRealizationDataQueryContext = {
    ensembleIdent: RegularEnsembleIdent;
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
    ResultWithWarnings<RelpermRealizationDataResponse_api>,
    AxiosError,
    ResultWithWarnings<RelpermRealizationDataResponse_api>,
    RelPermRealizationDataQueryKey,
    RelPermDataAccessorStatus
>(makeRelPermRealizationDataQueryOptions);

function makeRelPermTableNamesQueryOptions(get: Getter) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);

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
                return { ...options, enabled: Boolean(ensembleIdent) && ensembleIdentsValid };
            };
        }),
    };
}

function makeRelPermTableDefinitionQueryOptions(get: Getter) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);
    const { value: selectedTableName, isValidInContext: tableNameValid } = get(selectedTableNameAtom);

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
                return { ...options, enabled: Boolean(selectedTableName) && ensembleIdentsValid && tableNameValid };
            };
        }),
    };
}

function makeRelPermRealizationDataQueryOptions(get: Getter) {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);
    const { value: selectedTableName, isValidInContext: tableNameValid } = get(selectedTableNameAtom);
    const { value: selectedSaturationAxisName, isValidInContext: saturationAxisNameValid } =
        get(selectedSaturationAxisNameAtom);
    const { value: selectedCurveNames, isValidInContext: curveNamesValid } = get(selectedCurveNamesAtom);
    const { value: selectedSatnums, isValidInContext: satnumsValid } = get(selectedSatnumsAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);
    const tableDefinitionQueries = get(relPermTableDefinitionQueriesAtom);

    function makeQueryContext(ensembleIdent: RegularEnsembleIdent, index: number): RelPermRealizationDataQueryContext {
        return {
            ensembleIdent,
            tableDefinitionIsLoaded: Boolean(tableDefinitionQueries[index]?.data),
        };
    }

    const queryContexts = selectedEnsembleIdents.map(makeQueryContext);
    const areSelectionsValid =
        ensembleIdentsValid && tableNameValid && saturationAxisNameValid && curveNamesValid && satnumsValid;

    return {
        queries: queryContexts.map(function makeRelPermRealizationDataQuery({
            ensembleIdent,
            tableDefinitionIsLoaded,
        }) {
            const realizationsEncodedAsUintListStr = validRealizationNumbers
                ? encodeAsUintListStr(validRealizationNumbers)
                : null;
            const options = withWarnings(
                getRelpermRealizationDataOptions({
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
                }),
                getRelpermRealizationData,
            );

            return function getRelPermRealizationDataQueryOptions() {
                return {
                    ...options,
                    enabled: Boolean(
                        selectedTableName &&
                        selectedSaturationAxisName &&
                        selectedCurveNames.length > 0 &&
                        selectedSatnums.length > 0 &&
                        tableDefinitionIsLoaded &&
                        (validRealizationNumbers === null || validRealizationNumbers.length > 0) &&
                        areSelectionsValid,
                    ),
                };
            };
        }),
        combine: function combineRelPermRealizationDataQueryResults(
            results: UseQueryResult<ResultWithWarnings<RelpermRealizationDataResponse_api>, AxiosError>[],
        ): RelPermDataAccessorStatus {
            // A disabled query keeps its cached data and error, which may not match the current selections
            // (e.g. relative-permeability curves after switching to capillary pressure)
            if (!areSelectionsValid) {
                return {
                    dataAccessor: null,
                    isFetching: false,
                    isError: false,
                    errors: [],
                    warnings: [],
                };
            }

            const ensembleData: RelPermEnsembleRealizationData[] = [];
            const warnings: string[] = [];

            results.forEach(function collectEnsembleData(result, index) {
                const data = result.data;
                if (!data) {
                    return;
                }
                const ensembleIdent = queryContexts[index].ensembleIdent;
                ensembleData.push({ ensembleIdent, data: data.value });
                for (const warning of data.warnings) {
                    warnings.push(`${ensembleIdent.getEnsembleName()}: ${warning}`);
                }
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
                warnings,
            };
        },
    };
}
