import {
    FluidZone_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifierWithValues_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InplaceVolumetricsTableData } from "@modules/_shared/InplaceVolumetrics/types";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { InplaceVolumetricsIdentifier } from "src/api/models/InplaceVolumetricsIdentifier";

export type EnsembleIdentWithRealizations = {
    ensembleIdent: EnsembleIdent;
    realizations: readonly number[];
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type AggregatedTableDataResults = {
    tablesData: InplaceVolumetricsTableData[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    errors: Error[];
};

export function useGetAggregatedTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: InplaceVolumetricResultName_api[],
    fluidZones: FluidZone_api[],
    accumulateByIdentifiers: InplaceVolumetricsIdentifier[],
    accumulateFluidZones: boolean,
    calculateMeanAcrossRealizations: boolean,
    identifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[]
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
            source.realizations,
            fluidZones,
            accumulateByIdentifiers,
            accumulateFluidZones,
            calculateMeanAcrossRealizations,
            resultNames,
            identifiersWithValues,
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
                    accumulate_by_identifiers: accumulateByIdentifiers,
                    identifiers_with_values: identifiersWithValues,
                },
                [...source.realizations]
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: Boolean(
            source.realizations.length && fluidZones.length && resultNames.length && identifiersWithValues.length
        ),
    }));

    return useQueries({
        queries,
        combine: (
            results: UseQueryResult<InplaceVolumetricTableDataPerFluidSelection_api, Error>[]
        ): AggregatedTableDataResults => {
            const tablesData: InplaceVolumetricsTableData[] = [];
            const errors: Error[] = [];
            for (const [index, result] of results.entries()) {
                if (result.data) {
                    tablesData.push({
                        ensembleIdent: uniqueSources[index].ensembleIdent,
                        tableName: uniqueSources[index].tableName,
                        data: result.data,
                    });
                }
                if (result.error) {
                    errors.push(result.error);
                }
            }

            return {
                tablesData: tablesData,
                isFetching: results.some((result) => result.isFetching),
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
                errors: errors,
            };
        },
    });
}
