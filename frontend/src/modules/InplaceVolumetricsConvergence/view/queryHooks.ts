import {
    InplaceVolumetricData_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricsIdentifierWithValues_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useQueries } from "@tanstack/react-query";

import { EnsembleIdentWithRealizations } from "../typesAndEnums";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGetAggregatedTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: InplaceVolumetricResultName_api[],
    aggregateBy: string[],
    realizations: number[],
    indexFilter: InplaceVolumetricsIdentifierWithValues_api[]
): InplaceVolumetricData_api {
    const uniqueSources: { ensembleIdent: EnsembleIdent; realizations: number[]; tableName: string }[] = [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const queries = uniqueSources.map((source) => ({
        queryKey: [
            "getAggregatedTableData",
            source.ensembleIdent.toString(),
            source.tableName,
            JSON.stringify(source.realizations),
            JSON.stringify(resultNames),
            JSON.stringify(aggregateBy),
            JSON.stringify(indexFilter),
        ],
        queryFn: () =>
            apiService.inplaceVolumetrics.postGetAggregatedTableData(
                source.ensembleIdent.getCaseUuid(),
                source.ensembleIdent.getEnsembleName(),
                source.tableName,
                resultNames,
                aggregateBy,
                source.realizations,
                {
                    index_filter: indexFilter,
                }
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
    }));

    return useQueries({
        queries,
    });
}
