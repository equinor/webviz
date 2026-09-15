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
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import { subtractPerRealizationTablesMemoized } from "@modules/_shared/InplaceVolumes/deltaTableUtils";
import type {
    DeltaDroppedFluidSelections,
    DeltaUnmatchedRows,
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableData,
} from "@modules/_shared/InplaceVolumes/types";

export type EnsembleIdentWithRealizations = {
    ensembleIdent: RegularEnsembleIdent;
    realizations: readonly number[];
};

export type DeltaEnsembleIdentWithRealizations = {
    ensembleIdent: DeltaEnsembleIdent;
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

export type AggregatedDeltaTableDataResults = AggregatedTableDataResults & {
    droppedFluidSelections: DeltaDroppedFluidSelections[];
    unmatchedRows: DeltaUnmatchedRows[];
};

type DeltaQuerySpec = {
    tableName: string;
    caseUuid: string;
    ensembleName: string;
    realizations: readonly number[];
};

/** Track the two source queries for each delta table. */
type DeltaQueryPair = {
    deltaEnsembleIdent: DeltaEnsembleIdent;
    tableName: string;
    comparisonQueryIndex: number;
    referenceQueryIndex: number;
};

export function makeAggregatedStatisticalTableDataQueryOptions(
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

export function makeAggregatedPerRealizationTableDataQueryOptions(
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

/**
 * Fetch both source tables for each delta, using the same shared realizations.
 * Subtract matching rows in the browser and return the usual per-realization table format.
 *
 * The same realization number must represent the same sample in both ensembles.
 * The app cannot check this, so callers must explain this requirement to users.
 */
export function makeAggregatedPerRealizationDeltaTableDataQueryOptions(
    deltaEnsembleIdentsWithRealizations: DeltaEnsembleIdentWithRealizations[],
    tableNames: string[],
    resultNames: string[],
    groupByIndices: string[],
    indicesWithValues: InplaceVolumesIndexWithValues_api[],
    allowEnable: boolean,
) {
    const querySpecs: DeltaQuerySpec[] = [];
    const queryPairs: DeltaQueryPair[] = [];
    for (const el of deltaEnsembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            const comparisonEnsembleIdent = el.ensembleIdent.getComparisonEnsembleIdent();
            const referenceEnsembleIdent = el.ensembleIdent.getReferenceEnsembleIdent();

            const comparisonQueryIndex = querySpecs.length;
            querySpecs.push({
                tableName,
                caseUuid: comparisonEnsembleIdent.getCaseUuid(),
                ensembleName: comparisonEnsembleIdent.getEnsembleName(),
                realizations: el.realizations,
            });

            const referenceQueryIndex = querySpecs.length;
            querySpecs.push({
                tableName,
                caseUuid: referenceEnsembleIdent.getCaseUuid(),
                ensembleName: referenceEnsembleIdent.getEnsembleName(),
                realizations: el.realizations,
            });

            queryPairs.push({
                deltaEnsembleIdent: el.ensembleIdent,
                tableName,
                comparisonQueryIndex,
                referenceQueryIndex,
            });
        }
    }

    const eachIndexHasValues = indicesWithValues.every((index) => index.values.length > 0);
    const validGroupByIndices = groupByIndices.length === 0 ? null : groupByIndices;

    const queries = querySpecs.map(function makeDeltaSourceQuery(spec) {
        const validRealizations = spec.realizations.length === 0 ? null : [...spec.realizations];
        const validRealizationsEncodedAsUintListStr = validRealizations ? encodeAsUintListStr(validRealizations) : null;
        const options = postGetAggregatedPerRealizationInplaceTableDataOptions({
            query: {
                ensemble_name: spec.ensembleName,
                case_uuid: spec.caseUuid,
                table_name: spec.tableName,
                result_names: resultNames,
                group_by_indices: validGroupByIndices,
                realizations_encoded_as_uint_list_str: validRealizationsEncodedAsUintListStr,
            },
            body: {
                indices_with_values: indicesWithValues,
            },
        });
        return function getDeltaSourceQueryOptions() {
            return {
                ...options,
                enabled: Boolean(
                    allowEnable &&
                    spec.caseUuid &&
                    spec.ensembleName &&
                    spec.tableName &&
                    validRealizationsEncodedAsUintListStr &&
                    validRealizations?.length &&
                    resultNames.length &&
                    eachIndexHasValues,
                ),
            };
        };
    });

    function combine(
        results: UseQueryResult<InplaceVolumesTableDataPerFluidSelection_api, Error>[],
    ): AggregatedDeltaTableDataResults {
        const tablesData: InplaceVolumesTableData[] = [];
        const errors: Error[] = [];
        const droppedFluidSelections: DeltaDroppedFluidSelections[] = [];
        const unmatchedRows: DeltaUnmatchedRows[] = [];

        for (const queryPair of queryPairs) {
            const comparisonResult = results[queryPair.comparisonQueryIndex];
            const referenceResult = results[queryPair.referenceQueryIndex];

            if (comparisonResult?.error) {
                errors.push(comparisonResult.error);
            }
            if (referenceResult?.error) {
                errors.push(referenceResult.error);
            }

            if (comparisonResult?.data && referenceResult?.data) {
                const deltaResult = subtractPerRealizationTablesMemoized(comparisonResult.data, referenceResult.data);
                tablesData.push({
                    ensembleIdent: queryPair.deltaEnsembleIdent,
                    tableName: queryPair.tableName,
                    data: deltaResult.data,
                });
                if (deltaResult.droppedFluidSelections.length > 0) {
                    droppedFluidSelections.push({
                        ensembleIdent: queryPair.deltaEnsembleIdent,
                        tableName: queryPair.tableName,
                        fluidSelections: deltaResult.droppedFluidSelections,
                    });
                }
                if (deltaResult.unmatchedRows.length > 0) {
                    unmatchedRows.push({
                        ensembleIdent: queryPair.deltaEnsembleIdent,
                        tableName: queryPair.tableName,
                        rows: deltaResult.unmatchedRows,
                    });
                }
            }
        }

        return {
            tablesData: tablesData,
            isFetching: results.some((result) => result.isFetching),
            // A delta needs both sides, so failure is per pair rather than per raw request.
            allQueriesFailed:
                queryPairs.length > 0 &&
                queryPairs.every(
                    ({ comparisonQueryIndex, referenceQueryIndex }) =>
                        results[comparisonQueryIndex]?.isError || results[referenceQueryIndex]?.isError,
                ),
            errors: errors,
            droppedFluidSelections,
            unmatchedRows,
        };
    }

    return {
        queries,
        combine,
    };
}
