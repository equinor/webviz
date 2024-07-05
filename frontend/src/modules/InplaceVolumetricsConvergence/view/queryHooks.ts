import {
    FluidZone_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifierWithValues_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { EnsembleIdentWithRealizations } from "../typesAndEnums";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type AggregatedTableDataResults = {
    tableData: {
        ensembleIdent: EnsembleIdent;
        tableName: string;
        data?: InplaceVolumetricTableDataPerFluidSelection_api;
    }[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

export function useGetAggregatedTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: InplaceVolumetricResultName_api[],
    fluidZones: FluidZone_api[],
    accumulateFluidZones: boolean,
    calculateMeanAcrossRealizations: boolean,
    identifiers_with_values: InplaceVolumetricsIdentifierWithValues_api[]
): AggregatedTableDataResults {
    const uniqueSources: { ensembleIdent: EnsembleIdent; realizations: readonly number[]; tableName: string }[] = [];
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
            JSON.stringify(fluidZones),
            accumulateFluidZones,
            calculateMeanAcrossRealizations,
            JSON.stringify(resultNames),
            JSON.stringify(identifiers_with_values),
        ],
        queryFn: () =>
            apiService.inplaceVolumetrics.postGetAggregatedTableData(
                source.ensembleIdent.getCaseUuid(),
                source.ensembleIdent.getEnsembleName(),
                source.tableName,
                resultNames,
                fluidZones,
                accumulateFluidZones,
                calculateMeanAcrossRealizations,
                {
                    accumulate_by_identifiers: identifiers_with_values.map((el) => el.identifier),
                    identifiers_with_values,
                },
                [...source.realizations]
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: Boolean(
            source.realizations.length && fluidZones.length && resultNames.length && identifiers_with_values.length
        ),
    }));

    return useQueries({
        queries,
        combine: (
            results: UseQueryResult<InplaceVolumetricTableDataPerFluidSelection_api, Error>[]
        ): AggregatedTableDataResults => {
            return {
                tableData: results.map((result, index) => ({
                    ensembleIdent: uniqueSources[index].ensembleIdent,
                    tableName: uniqueSources[index].tableName,
                    data: result.data,
                })),
                isFetching: results.some((result) => result.isFetching),
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
            };
        },
    });
}
