import { Body_get_realizations_response_api, EnsembleScalarResponse_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    QueriesOptions,
    UndefinedInitialDataOptions,
    UseQueryResult,
    useQueries,
    useQuery,
} from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type ResponseData = {
    data: Array<{
        ensembleIdent?: EnsembleIdent;
        tableName?: string;
        responseName?: string;
        responses?: EnsembleScalarResponse_api;
        error: boolean;
    }>;
    isFetching: boolean;
};

export function useRealizationsResponses(
    ensembleIdents: EnsembleIdent[],
    tableNames: string[], // also known as "source"
    responseNames: string[],
    filters?: Body_get_realizations_response_api
): ResponseData {
    const queries: UndefinedInitialDataOptions<EnsembleScalarResponse_api>[] = [];

    for (const ensembleIdent of ensembleIdents) {
        for (const responseName of responseNames) {
            for (const tableName of tableNames) {
                queries.push({
                    queryKey: ["getRealizationsResponse", ensembleIdent?.toString(), tableName, responseName, filters],
                    queryFn: () => {
                        const caseUuid = ensembleIdent?.getCaseUuid();
                        const ensembleName = ensembleIdent?.getEnsembleName();
                        return apiService.inplaceVolumetrics.getRealizationsResponse(
                            caseUuid,
                            ensembleName,
                            tableName,
                            responseName,
                            filters
                        );
                    },
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                    enabled: Boolean(ensembleIdent && tableName && responseName),
                    meta: {
                        ensembleIdent,
                        tableName,
                        responseName,
                    },
                });
            }
        }
    }

    return useQueries({
        queries,
        combine: (results: UseQueryResult<EnsembleScalarResponse_api>[]): ResponseData => ({
            data: results.map((result, index) => {
                const meta = queries[index]?.meta as {
                    ensembleIdent: EnsembleIdent;
                    tableName: string;
                    responseName: string;
                };
                return {
                    ensembleIdent: meta?.ensembleIdent,
                    tableName: meta?.tableName,
                    responseName: meta?.responseName,
                    responses: result.data,
                    error: result.isError,
                };
            }),
            isFetching: results.some((result) => result.isFetching && !result.isError),
        }),
    });
}
