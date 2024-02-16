import { PvtData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

import { PvtTableCollection } from "./typesAndEnums";

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
    tableCollections: PvtTableCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

export function usePvtDataQueries(ensembleIdents: EnsembleIdent[], realizations: number[]): CombinedPvtDataResult {
    const ensembleIdentsAndRealizations: { ensembleIdent: EnsembleIdent; realization: number }[] = [];
    for (const ensembleIdent of ensembleIdents) {
        for (const realization of realizations) {
            ensembleIdentsAndRealizations.push({ ensembleIdent, realization });
        }
    }
    return useQueries({
        queries: ensembleIdentsAndRealizations
            .map((el) => {
                return {
                    queryKey: ["tableData", el.ensembleIdent.toString(), el.realization],
                    queryFn: () =>
                        apiService.pvt.tableData(
                            el.ensembleIdent.getCaseUuid(),
                            el.ensembleIdent.getEnsembleName(),
                            el.realization
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                    enabled: !!(el.ensembleIdent && el.realization !== null),
                };
            })
            .flat(),
        combine: (results) => {
            return {
                tableCollections: ensembleIdentsAndRealizations.map((el, idx) => {
                    return {
                        ensembleIdent: el.ensembleIdent,
                        realization: el.realization,
                        tables: results[idx]?.data ?? [],
                    };
                }),
                isFetching: results.some((result) => result.isFetching),
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
            };
        },
    });
}
