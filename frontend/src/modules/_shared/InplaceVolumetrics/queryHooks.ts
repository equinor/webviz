import {
    FluidZone_api,
    InplaceStatisticalVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifierWithValues_api,
    InplaceVolumetricsIdentifier_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    InplaceVolumetricsStatisticalTableData,
    InplaceVolumetricsTableData,
} from "@modules/_shared/InplaceVolumetrics/types";
import { UseQueryResult } from "@tanstack/react-query";

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

export type AggregatedStatisticalTableDataResults = {
    tablesData: InplaceVolumetricsStatisticalTableData[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    errors: Error[];
};

export function useGetAggregatedStatisticalTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: InplaceVolumetricResultName_api[],
    fluidZones: FluidZone_api[],
    groupByIdentifiers: InplaceVolumetricsIdentifier_api[],
    accumulateFluidZones: boolean,
    identifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[],
    allowEnable: boolean
) {
    const uniqueSources: { ensembleIdent: EnsembleIdent; realizations: readonly number[]; tableName: string }[] = [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIdentifierHasValues = identifiersWithValues.every((identifier) => identifier.values.length > 0);
    const validGroupByIdentifiers = groupByIdentifiers.length === 0 ? null : groupByIdentifiers;

    const queries = uniqueSources.map((source) => {
        const validRealizations = source.realizations.length === 0 ? null : [...source.realizations];
        return () => ({
            queryKey: [
                "postGetAggregatedStatisticalTableData",
                source.ensembleIdent.toString(),
                source.tableName,
                source.realizations,
                fluidZones,
                groupByIdentifiers,
                accumulateFluidZones,
                resultNames,
                identifiersWithValues,
            ],
            queryFn: () =>
                apiService.inplaceVolumetrics.postGetAggregatedStatisticalTableData(
                    source.ensembleIdent.getCaseUuid(),
                    source.ensembleIdent.getEnsembleName(),
                    source.tableName,
                    resultNames,
                    fluidZones,
                    accumulateFluidZones,
                    {
                        identifiers_with_values: identifiersWithValues,
                    },
                    validGroupByIdentifiers,
                    validRealizations
                ),
            staleTime: STALE_TIME,
            cacheTime: CACHE_TIME,
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizations &&
                    validRealizations.length &&
                    fluidZones.length &&
                    resultNames.length &&
                    eachIdentifierHasValues
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceStatisticalVolumetricTableDataPerFluidSelection_api, Error>[]
    ): AggregatedStatisticalTableDataResults {
        const tablesData: InplaceVolumetricsStatisticalTableData[] = [];
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
            allQueriesFailed: results.length > 0 && results.every((result) => result.isError),
            errors: errors,
        };
    }

    return {
        queries,
        combine,
    };
}

export function useGetAggregatedPerRealizationTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: InplaceVolumetricResultName_api[],
    fluidZones: FluidZone_api[],
    groupByIdentifiers: InplaceVolumetricsIdentifier_api[],
    accumulateFluidZones: boolean,
    identifiersWithValues: InplaceVolumetricsIdentifierWithValues_api[],
    allowEnable: boolean
) {
    const uniqueSources: { ensembleIdent: EnsembleIdent; realizations: readonly number[]; tableName: string }[] = [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIdentifierHasValues = identifiersWithValues.every((identifier) => identifier.values.length > 0);
    const validGroupByIdentifiers = groupByIdentifiers.length === 0 ? null : groupByIdentifiers;

    const queries = uniqueSources.map((source) => {
        const validRealizations = source.realizations.length === 0 ? null : [...source.realizations];
        return () => ({
            queryKey: [
                "postGetAggregatedPerRealizationTableData",
                source.ensembleIdent.toString(),
                source.tableName,
                source.realizations,
                fluidZones,
                groupByIdentifiers,
                accumulateFluidZones,
                resultNames,
                identifiersWithValues,
            ],
            queryFn: () =>
                apiService.inplaceVolumetrics.postGetAggregatedPerRealizationTableData(
                    source.ensembleIdent.getCaseUuid(),
                    source.ensembleIdent.getEnsembleName(),
                    source.tableName,
                    resultNames,
                    fluidZones,
                    accumulateFluidZones,

                    {
                        identifiers_with_values: identifiersWithValues,
                    },
                    validGroupByIdentifiers,
                    validRealizations
                ),
            staleTime: STALE_TIME,
            cacheTime: CACHE_TIME,
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizations &&
                    validRealizations.length &&
                    fluidZones.length &&
                    resultNames.length &&
                    eachIdentifierHasValues
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceVolumetricTableDataPerFluidSelection_api, Error>[]
    ): AggregatedTableDataResults {
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
            allQueriesFailed: results.length > 0 && results.every((result) => result.isError),
            errors: errors,
        };
    }

    return {
        queries,
        combine,
    };
}
