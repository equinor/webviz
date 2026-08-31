import type { UseQueryResult } from "@tanstack/react-query";

import type {
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesIndexWithValues_api,
    InplaceVolumesTableDataPerFluidSelection_api,
} from "@api";
import {
    postGetAggregatedPerRealizationInplaceTableDataOptions,
    postGetAggregatedStatisticalInplaceTableDataOptions,
} from "@api";
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
    allQueriesFailed: boolean;
    errors: Error[];
};

export type AggregatedStatisticalTableDataResults = {
    tablesData: InplaceVolumesStatisticalTableData[];
    isFetching: boolean;
    allQueriesFailed: boolean;
    errors: Error[];
};

/** A single data source: one table within one ensemble. */
export type InplaceVolumesSource = {
    ensembleIdent: RegularEnsembleIdent;
    realizations: readonly number[];
    tableName: string;
};

export function useGetAggregatedStatisticalTableDataQueries(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: string[],
    groupByIndices: string[],
    indicesWithValues: InplaceVolumesIndexWithValues_api[],
    allowEnable: boolean,
) {
    const sources: InplaceVolumesSource[] = [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            sources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    return makeAggregatedStatisticalTableDataQueryOptions(
        sources,
        resultNames,
        groupByIndices,
        indicesWithValues,
        allowEnable,
    );
}

/**
 * Same as `useGetAggregatedStatisticalTableDataQueries`, but for an explicit list of sources rather
 * than the cross-product of ensembles and table names. Lets a caller pair a different table with
 * each ensemble, or use two tables from the same ensemble.
 *
 * Builds query options only, so it can be called from an atom as well as from a hook.
 */
export function makeAggregatedStatisticalTableDataQueryOptions(
    sources: InplaceVolumesSource[],
    resultNames: string[],
    groupByIndices: string[],
    indicesWithValues: InplaceVolumesIndexWithValues_api[],
    allowEnable: boolean,
) {
    const eachIndexHasValues = indicesWithValues.every((index) => index.values.length > 0);
    const validGroupByIndices = groupByIndices.length === 0 ? null : groupByIndices;

    const queries = sources.map((source) => {
        const validRealizations = source.realizations.length === 0 ? null : [...source.realizations];
        const validRealizationsEncodedAsUintListStr = validRealizations ? encodeAsUintListStr(validRealizations) : null;
        const options = postGetAggregatedStatisticalInplaceTableDataOptions({
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
        });
        return () => ({
            ...options,
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
                    ensembleIdent: sources[index].ensembleIdent,
                    tableName: sources[index].tableName,
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
    groupByIndices: string[],
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
        const options = postGetAggregatedPerRealizationInplaceTableDataOptions({
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
        });
        return () => ({
            ...options,
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
            allQueriesFailed: results.length > 0 && results.every((result) => result.isError),
            errors: errors,
        };
    }

    return {
        queries,
        combine,
    };
}
