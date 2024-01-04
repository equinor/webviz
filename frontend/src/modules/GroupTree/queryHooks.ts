import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { Data } from "@webviz/group-tree/dist/redux/types"
import { Frequency_api, StatisticFunction_api } from "@api";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useRealizationGroupTreeQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNumber: number | undefined,
    resamplingFrequency: Frequency_api | null
): UseQueryResult<any[]> {
    return useQuery({
        queryKey: ["getGroupTreeData", caseUuid, ensembleName, realizationNumber, resamplingFrequency],
        queryFn: () =>
            apiService.groupTree.getRealizationGroupTreeData(caseUuid ?? "", ensembleName ?? "", realizationNumber, resamplingFrequency),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useStatisticsGroupTreeQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    statOption: StatisticFunction_api,
    resamplingFrequency: Frequency_api | null
): UseQueryResult<any[]> {
    return useQuery({
        queryKey: ["getGroupTreeData", caseUuid, ensembleName, statOption, resamplingFrequency],
        queryFn: () =>
            apiService.groupTree.getStatisticalGroupTreeData(caseUuid ?? "", ensembleName ?? "", statOption, resamplingFrequency),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}