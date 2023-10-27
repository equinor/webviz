import { InplaceVolumetricsTableMetaData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type TableNamesAndMetaData = {
    data: Array<{
        ensembleIdent: EnsembleIdent;
        tableNamesAndMetadata?: InplaceVolumetricsTableMetaData_api[];
    }>;
    isFetching: boolean;
};

export function useTableNamesAndMetadata(ensembleIdents: EnsembleIdent[]): TableNamesAndMetaData {
    return useQueries({
        queries: ensembleIdents.map((ensembleIdent) => ({
            queryKey: ["getTableNamesAndMetaData", ensembleIdent?.toString()],
            queryFn: () => {
                const caseUuid = ensembleIdent?.getCaseUuid();
                const ensembleName = ensembleIdent?.getEnsembleName();
                return apiService.inplaceVolumetrics.getTableNamesAndMetadata(caseUuid ?? "", ensembleName ?? "");
            },
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(ensembleIdent),
        })),
        combine: (results: UseQueryResult<Array<InplaceVolumetricsTableMetaData_api>>[]) => ({
            data: results.map((result, index) => ({
                ensembleIdent: ensembleIdents[index],
                tableNamesAndMetadata: result.data,
            })),
            isFetching: results.some((result) => result.isFetching),
        }),
    });
}
