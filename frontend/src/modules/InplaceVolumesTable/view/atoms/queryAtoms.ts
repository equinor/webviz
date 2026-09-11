import { atom } from "jotai";

import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    makeAggregatedPerRealizationDeltaTableDataQueryOptions,
    makeAggregatedPerRealizationTableDataQueryOptions,
    makeAggregatedStatisticalTableDataQueryOptions,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { computeStatisticalTableFromPerRealizationTableMemoized } from "@modules/_shared/InplaceVolumes/statisticalTableUtils";
import type { InplaceVolumesStatisticalTableData } from "@modules/_shared/InplaceVolumes/types";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { groupByIndicesAtom, areTableDefinitionSelectionsValidAtom, resultNamesAtom, tableTypeAtom } from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    deltaEnsembleIdentsWithRealizationsAtom,
    ensembleIdentsWithRealizationsAtom,
    indicesWithValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

const regularPerRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries =
        tableType === TableType.PER_REALIZATION && areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return makeAggregatedPerRealizationTableDataQueryOptions(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});

const deltaPerRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const deltaEnsembleIdentsWithRealizations = get(deltaEnsembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    // Not gated on table type: both tables are derived from this same per-realization data, since
    // the backend cannot aggregate a difference.
    const enableQueries = areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return makeAggregatedPerRealizationDeltaTableDataQueryOptions(
        deltaEnsembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});

/** Per-realization data for both regular and delta ensembles, the latter already differenced. */
export const perRealizationTableDataResultsAtom = atom((get) => {
    const regular = get(regularPerRealizationTableDataResultsAtom);
    const delta = get(deltaPerRealizationTableDataResultsAtom);

    const tablesData = [...regular.tablesData, ...delta.tablesData];

    return {
        tablesData,
        isFetching: regular.isFetching || delta.isFetching,
        allQueriesFailed: (regular.allQueriesFailed || delta.allQueriesFailed) && tablesData.length === 0,
        errors: [...regular.errors, ...delta.errors],
        droppedFluidSelections: delta.droppedFluidSelections,
        unmatchedRows: delta.unmatchedRows,
    };
});

const regularStatisticalTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries =
        tableType === TableType.STATISTICAL && areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return makeAggregatedStatisticalTableDataQueryOptions(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});

/**
 * Statistics for both regular and delta ensembles. Regular ensembles are aggregated by the backend,
 * delta ensembles client-side from their per-realization difference.
 */
export const statisticalTableDataResultsAtom = atom((get) => {
    const regular = get(regularStatisticalTableDataResultsAtom);
    const delta = get(deltaPerRealizationTableDataResultsAtom);

    const deltaTablesData: InplaceVolumesStatisticalTableData[] = delta.tablesData.map((tableData) => ({
        ensembleIdent: tableData.ensembleIdent,
        tableName: tableData.tableName,
        data: computeStatisticalTableFromPerRealizationTableMemoized(tableData.data),
    }));

    const tablesData = [...regular.tablesData, ...deltaTablesData];

    return {
        tablesData,
        isFetching: regular.isFetching || delta.isFetching,
        allQueriesFailed: (regular.allQueriesFailed || delta.allQueriesFailed) && tablesData.length === 0,
        errors: [...regular.errors, ...delta.errors],
        droppedFluidSelections: delta.droppedFluidSelections,
        unmatchedRows: delta.unmatchedRows,
    };
});
