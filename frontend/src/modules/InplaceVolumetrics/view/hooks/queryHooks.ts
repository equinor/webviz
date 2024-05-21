import { InplaceVolumetricResponseNames_api } from "@api";
import { apiService } from "@framework/ApiService";
import {
    CombinedInplaceVolDataEnsembleSetResults,
    EnsembleIdentWithRealizations,
    InplaceVolDataEnsembleSet,
} from "@modules/InplaceVolumetrics/typesAndEnums";
import { useQueries } from "@tanstack/react-query";

import { InplaceVolumetricsIndex } from "src/api/models/InplaceVolumetricsIndex";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;
export function useInplaceDataResultsQuery(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null,
    indexFilter: InplaceVolumetricsIndex[] | null
): CombinedInplaceVolDataEnsembleSetResults {
    return useQueries({
        queries: ensembleIdentsWithRealizations.map((ensembleIdentWithReals) =>
            createQueryForInplaceDataResults(ensembleIdentWithReals, tableName, responseName, indexFilter)
        ),
        combine: (results) => {
            const combinedResult: InplaceVolDataEnsembleSet[] = [];
            results.forEach((result, index) => {
                combinedResult.push({
                    ensembleIdentString: ensembleIdentsWithRealizations[index]?.ensembleIdent.toString() || "",
                    data: result.data ? result.data : null,
                });
            });

            return {
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
                isFetching: results.some((result) => result.isFetching),
                ensembleSetData: combinedResult,
            };
        },
    });
}

export function createQueryForInplaceDataResults(
    ensIdentWithReals: EnsembleIdentWithRealizations,
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null,
    indexFilter: InplaceVolumetricsIndex[] | null
) {
    console.log(Boolean(ensIdentWithReals && tableName && responseName && indexFilter !== null));
    console.log(indexFilter);
    console.log(indexFilter ? { index_filter: indexFilter } : { index_filter: [] });
    return {
        queryKey: [
            "getInplaceDataResults",
            ensIdentWithReals.ensembleIdent.toString(),
            tableName,
            responseName,
            JSON.stringify(ensIdentWithReals.realizations),
            JSON.stringify(indexFilter),
        ],
        queryFn: () =>
            apiService.inplaceVolumetrics.getResultDataPerRealization(
                ensIdentWithReals.ensembleIdent.getCaseUuid(),
                ensIdentWithReals.ensembleIdent.getEnsembleName(),
                tableName ?? "",
                responseName ?? InplaceVolumetricResponseNames_api.STOIIP_OIL,
                ensIdentWithReals.realizations ?? [],
                indexFilter ? { index_filter: indexFilter } : { index_filter: [] }
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(ensIdentWithReals && tableName && responseName && indexFilter),
    };
}
