import type { UseQueryResult } from "@tanstack/react-query";

import type {
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesIndexWithValues_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    InplaceVolumesIndex_api,
} from "@api";
import { postGetAggregatedPerRealizationTableDataOptions, postGetAggregatedStatisticalTableDataOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import type {
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableData,
} from "@modules/_shared/InplaceVolumes/types";

export type EnsembleIdentWithRealizations = {
    ensembleIdent: RegularEnsembleIdent;
    realizations: readonly number[];
};

export type AggregatedTableDataResults = {
    tablesData: InplaceVolumesTableData[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    errors: Error[];
};

export type AggregatedStatisticalTableDataResults = {
    tablesData: InplaceVolumesStatisticalTableData[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    errors: Error[];
};

export function useGetAggregatedStatisticalTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: string[],
    groupByIndices: InplaceVolumesIndex_api[],
    indicesWithValues: InplaceVolumesIndexWithValues_api[],
    allowEnable: boolean,
) {
    const uniqueSources: { ensembleIdent: RegularEnsembleIdent; realizations: readonly number[]; tableName: string }[] =
        [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIndexHasValues = indicesWithValues.every((index) => index.values.length > 0);
    const validGroupByIndices = groupByIndices.length === 0 ? null : groupByIndices;

    const queries = uniqueSources.map((source) => {
        const validRealizations = source.realizations.length === 0 ? null : [...source.realizations];
        const validRealizationsEncodedAsUintListStr = validRealizations ? encodeAsUintListStr(validRealizations) : null;
        return () => ({
            ...postGetAggregatedStatisticalTableDataOptions({
                query: {
                    ensemble_name: source.ensembleIdent.getEnsembleName(),
                    case_uuid: source.ensembleIdent.getCaseUuid(),
                    table_name: source.tableName,
                    result_names: resultNames,
                    group_by_indices: validGroupByIndices,
                    realizations_encoded_as_uint_list_str: validRealizationsEncodedAsUintListStr,
                },
                body: {
                    indices_with_values: indicesWithValues,
                },
            }),
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizationsEncodedAsUintListStr &&
                    validRealizations?.length &&
                    resultNames.length &&
                    eachIndexHasValues,
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceVolumesStatisticalTableDataPerFluidSelection_api, Error>[],
    ): AggregatedStatisticalTableDataResults {
        const tablesData: InplaceVolumesStatisticalTableData[] = [];
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
    resultNames: string[],
    groupByIndices: InplaceVolumesIndex_api[],
    indicesWithValues: InplaceVolumesIndexWithValues_api[],
    allowEnable: boolean,
) {
    const uniqueSources: { ensembleIdent: RegularEnsembleIdent; realizations: readonly number[]; tableName: string }[] =
        [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIndexHasValues = indicesWithValues.every((index) => index.values.length > 0);
    const validGroupByIndices = groupByIndices.length === 0 ? null : groupByIndices;

    const queries = uniqueSources.map((source) => {
        const validRealizations = source.realizations.length === 0 ? null : [...source.realizations];
        const validRealizationsEncodedAsUintListStr = validRealizations ? encodeAsUintListStr(validRealizations) : null;
        return () => ({
            ...postGetAggregatedPerRealizationTableDataOptions({
                query: {
                    ensemble_name: source.ensembleIdent.getEnsembleName(),
                    case_uuid: source.ensembleIdent.getCaseUuid(),
                    table_name: source.tableName,
                    result_names: resultNames,
                    group_by_indices: validGroupByIndices,
                    realizations_encoded_as_uint_list_str: validRealizationsEncodedAsUintListStr,
                },
                body: {
                    indices_with_values: indicesWithValues,
                },
            }),
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizationsEncodedAsUintListStr &&
                    validRealizations?.length &&
                    resultNames.length &&
                    eachIndexHasValues,
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceVolumesTableDataPerFluidSelection_api, Error>[],
    ): AggregatedTableDataResults {
        const tablesData: InplaceVolumesTableData[] = [];
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
