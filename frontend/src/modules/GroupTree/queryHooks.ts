import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { Data } from "@webviz/group-tree/dist/redux/types"

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGroupTreeQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNumber: number | undefined
): UseQueryResult<any[]> {
    return useQuery({
        queryKey: ["getGroupTreeData", caseUuid, ensembleName, realizationNumber],
        queryFn: () =>
            apiService.groupTree.getGroupTreeData(caseUuid ?? "", ensembleName ?? "", realizationNumber),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}