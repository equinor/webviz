import type { UseQueryResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import {
    getRelpermRealizationDataOptions,
    getRelpermTableDefinitionOptions,
    getRelpermTableNamesOptions,
    type HTTPValidationError_api,
    type RelpermRealizationDataResponse_api,
    type RelpermTableDefinition_api,
} from "@api";
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

export const relPermTableNamesQueriesAtom = atomWithQueries<string[], RelPermApiError, string[], any>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return {
        queries: selectedEnsembleIdents.map((ensembleIdent) => {
            const options = getRelpermTableNamesOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return () => ({ ...options, enabled: Boolean(ensembleIdent) });
        }),
    };
});

export const relPermTableDefinitionQueriesAtom = atomWithQueries<
    RelpermTableDefinition_api,
    RelPermApiError,
    RelpermTableDefinition_api,
    any
>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableName = get(selectedTableNameAtom);

    return {
        queries: selectedEnsembleIdents.map((ensembleIdent) => {
            const options = getRelpermTableDefinitionOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    table_name: selectedTableName ?? "",
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });

            return () => ({ ...options, enabled: Boolean(selectedTableName) });
        }),
    };
});

export const relPermRealizationDataQueriesAtom = atomWithQueries<
    RelpermRealizationDataResponse_api,
    RelPermApiError,
    RelpermRealizationDataResponse_api,
    any,
    RelPermDataAccessorStatus
>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableName = get(selectedTableNameAtom);
    const selectedSaturationAxisName = get(selectedSaturationAxisNameAtom);
    const selectedCurveNames = get(selectedCurveNamesAtom);
    const selectedSatnums = get(selectedSatnumsAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);
    const realizationsEncodedAsUintListStr = validRealizationNumbers ? encodeAsUintListStr(validRealizationNumbers) : null;

    const queryContexts = selectedEnsembleIdents.map((ensembleIdent) => ({ ensembleIdent }));

    return {
        queries: queryContexts.map(({ ensembleIdent }) => {
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

            return () => ({
                ...options,
                enabled: Boolean(
                    selectedTableName &&
                    selectedSaturationAxisName &&
                    selectedCurveNames.length > 0 &&
                    selectedSatnums.length > 0,
                ),
            });
        }),
        combine: (results: UseQueryResult<RelpermRealizationDataResponse_api, RelPermApiError>[]): RelPermDataAccessorStatus => {
            const ensembleData: RelPermEnsembleRealizationData[] = [];

            results.forEach((result, index) => {
                const data = result.data;
                if (!data) {
                    return;
                }
                ensembleData.push({ ensembleIdent: queryContexts[index].ensembleIdent, data });
            });

            return {
                dataAccessor: ensembleData.length > 0 ? new RelPermDataAccessor(ensembleData) : null,
                isFetching: results.some((result) => result.isFetching),
                isError: results.some((result) => result.isError),
                errors: results.map((result) => result.error).filter((error) => error !== null) as Error[],
            };
        },
    };
});

