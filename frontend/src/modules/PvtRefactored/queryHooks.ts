import { PvtData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function usePvtDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    realization: number | null
): UseQueryResult<PvtData_api[]> {
    return useQuery({
        queryKey: ["tableData", caseUuid, ensembleName, realization],
        queryFn: () => apiService.pvt.tableData(caseUuid ?? "", ensembleName ?? "", realization ?? 0),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && realization != null ? true : false,
    });
}

export type CombinedPvtDataResult = {
    pvtNums: number[];
    isFetching: boolean;
};

export function usePvtDataQueries(ensembleIdents: EnsembleIdent[], realizations: number[]): CombinedPvtDataResult {
    return useQueries({
        queries: ensembleIdents
            .map((ensembleIdent) => {
                return realizations.map((realization) => {
                    return {
                        queryKey: ["tableData", ensembleIdent.toString(), realization],
                        queryFn: () =>
                            apiService.pvt.tableData(
                                ensembleIdent.getCaseUuid(),
                                ensembleIdent.getEnsembleName(),
                                realization
                            ),
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                        enabled: !!(ensembleIdent && realization !== null),
                    };
                });
            })
            .flat(),
        combine: (results) => {
            return {
                pvtNums: results.reduce((acc, result) => {
                    const allPvtNums = result.data?.reduce((innerAcc, data) => {
                        if (innerAcc.includes(data.pvtnum)) {
                            return innerAcc;
                        }
                        return [...innerAcc, data.pvtnum];
                    }, [] as number[]);
                    if (!allPvtNums) {
                        return acc;
                    }
                    return Array.from(new Set([...acc, ...allPvtNums]));
                }, [] as number[]),
                isFetching: results.some((result) => result.isFetching),
            };
        },
    });
}
