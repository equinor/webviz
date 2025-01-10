import {
    Frequency_api,
    VectorHistoricalData_api,
    VectorStatisticSensitivityData_api,
    getHistoricalVectorDataOptions,
    getRealizationsVectorDataOptions,
    getStatisticalVectorDataPerSensitivityOptions,
} from "@api";
import { VectorRealizationData_api } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null
): UseQueryResult<Array<VectorRealizationData_api>> {
    const allOrNonEmptyRealArr = realizationsToInclude === null || realizationsToInclude.length > 0 ? true : false;
    const realizationsEncodedAsUintListStr = realizationsToInclude ? encodeAsUintListStr(realizationsToInclude) : null;
    return useQuery({
        ...getRealizationsVectorDataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                vector_name: vectorName ?? "",
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr ?? "",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && vectorName && allOrNonEmptyRealArr),
    });
}

export function useStatisticalVectorSensitivityDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorStatisticSensitivityData_api[]> {
    getStatisticalVectorDataPerSensitivityOptions;
    return useQuery({
        ...getStatisticalVectorDataPerSensitivityOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                vector_name: vectorName ?? "",
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
            },
        }),
        enabled: Boolean(allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency),
    });
}

export function useHistoricalVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorHistoricalData_api> {
    return useQuery({
        ...getHistoricalVectorDataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                non_historical_vector_name: vectorName ?? "",
                resampling_frequency: resampleFrequency ?? Frequency_api.MONTHLY,
            },
        }),
        enabled: Boolean(allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency),
    });
}
