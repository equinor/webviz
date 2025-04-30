import type { UseQueryResult } from "@tanstack/react-query";

import type {
    FluidZone_api,
    InplaceStatisticalVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifierWithValues_api,
    InplaceVolumetricsIdentifier_api,
} from "@api";
import { postGetAggregatedPerRealizationTableDataOptions, postGetAggregatedStatisticalTableDataOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import type {
    InplaceVolumetricsStatisticalTableData,
    InplaceVolumetricsTableData,
} from "@modules/_shared/InplaceVolumetrics/types";

export type EnsembleIdentWithRealizations = {
    ensembleIdent: RegularEnsembleIdent;
    realizations: readonly number[];
};

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
    allowEnable: boolean,
) {
    const uniqueSources: { ensembleIdent: RegularEnsembleIdent; realizations: readonly number[]; tableName: string }[] =
        [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIdentifierHasValues = identifiersWithValues.every((identifier) => identifier.values.length > 0);
    const validGroupByIdentifiers = groupByIdentifiers.length === 0 ? null : groupByIdentifiers;

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
                    fluid_zones: fluidZones,
                    accumulate_fluid_zones: accumulateFluidZones,
                    group_by_identifiers: validGroupByIdentifiers,
                    realizations_encoded_as_uint_list_str: validRealizationsEncodedAsUintListStr,
                },
                body: {
                    identifiers_with_values: identifiersWithValues,
                },
            }),
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizationsEncodedAsUintListStr &&
                    validRealizations?.length &&
                    fluidZones.length &&
                    resultNames.length &&
                    eachIdentifierHasValues,
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceStatisticalVolumetricTableDataPerFluidSelection_api, Error>[],
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
    allowEnable: boolean,
) {
    const uniqueSources: { ensembleIdent: RegularEnsembleIdent; realizations: readonly number[]; tableName: string }[] =
        [];
    for (const el of ensembleIdentsWithRealizations) {
        for (const tableName of tableNames) {
            uniqueSources.push({ ensembleIdent: el.ensembleIdent, realizations: el.realizations, tableName });
        }
    }

    const eachIdentifierHasValues = identifiersWithValues.every((identifier) => identifier.values.length > 0);
    const validGroupByIdentifiers = groupByIdentifiers.length === 0 ? null : groupByIdentifiers;

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
                    fluid_zones: fluidZones,
                    accumulate_fluid_zones: accumulateFluidZones,
                    group_by_identifiers: validGroupByIdentifiers,
                    realizations_encoded_as_uint_list_str: validRealizationsEncodedAsUintListStr,
                },
                body: {
                    identifiers_with_values: identifiersWithValues,
                },
            }),
            enabled: Boolean(
                allowEnable &&
                    source.ensembleIdent &&
                    source.tableName &&
                    validRealizationsEncodedAsUintListStr &&
                    validRealizations?.length &&
                    fluidZones.length &&
                    resultNames.length &&
                    eachIdentifierHasValues,
            ),
        });
    });

    function combine(
        results: UseQueryResult<InplaceVolumetricTableDataPerFluidSelection_api, Error>[],
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
