import { atom } from "jotai";

import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    makeAggregatedPerRealizationDeltaTableDataQueryOptions,
    makeAggregatedPerRealizationTableDataQueryOptions,
    makeAggregatedStatisticalTableDataQueryOptions,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { addSensitivityColumnToPerRealizationDataMemoized } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import { computeStatisticalTableFromPerRealizationTableMemoized } from "@modules/_shared/InplaceVolumes/statisticalTableUtils";
import type {
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableData,
} from "@modules/_shared/InplaceVolumes/types";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import {
    groupByIndicesAtom,
    areTableDefinitionSelectionsValidAtom,
    resultNamesAtom,
    sensitivitySelectionAtom,
    tableTypeAtom,
} from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    deltaEnsembleIdentsWithRealizationsAtom,
    ensembleIdentsWithRealizationsAtom,
    indicesWithValuesAtom,
    realizationToSensitivityCaseLabelMapAtom,
    tableNamesAtom,
} from "./derivedAtoms";

const regularPerRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);
    const isSensitivityModeActive = get(sensitivitySelectionAtom) !== null;

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    // In sensitivity mode statistics are computed per case client-side from per-realization data.
    const enableQueries =
        (tableType === TableType.PER_REALIZATION || isSensitivityModeActive) &&
        areSelectedTablesComparable &&
        areTableDefinitionSelectionsValid;

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

/** Regular per-realization data, with a SENSITIVITY column injected in sensitivity mode. */
const regularPerRealizationTableDataWithSensitivityAtom = atom((get) => {
    const regular = get(regularPerRealizationTableDataResultsAtom);
    const realizationToSensitivityCaseLabel = get(realizationToSensitivityCaseLabelMapAtom);

    if (!realizationToSensitivityCaseLabel) {
        return { ...regular, numDroppedSensitivityRows: 0 };
    }

    let numDroppedSensitivityRows = 0;
    const tablesData: InplaceVolumesTableData[] = regular.tablesData.map((tableData) => {
        const result = addSensitivityColumnToPerRealizationDataMemoized(
            tableData.data,
            realizationToSensitivityCaseLabel,
        );
        numDroppedSensitivityRows += result.numDroppedRows;
        return { ...tableData, data: result.data };
    });
    return { ...regular, tablesData, numDroppedSensitivityRows };
});

/** Per-realization data for both regular and delta ensembles, the latter already differenced. */
export const perRealizationTableDataResultsAtom = atom((get) => {
    const regular = get(regularPerRealizationTableDataWithSensitivityAtom);
    const delta = get(deltaPerRealizationTableDataResultsAtom);

    const tablesData = [...regular.tablesData, ...delta.tablesData];

    return {
        tablesData,
        isFetching: regular.isFetching || delta.isFetching,
        allQueriesFailed: (regular.allQueriesFailed || delta.allQueriesFailed) && tablesData.length === 0,
        errors: [...regular.errors, ...delta.errors],
        droppedFluidSelections: delta.droppedFluidSelections,
        unmatchedRows: delta.unmatchedRows,
        numDroppedSensitivityRows: regular.numDroppedSensitivityRows,
    };
});

const regularStatisticalTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);
    const isSensitivityModeActive = get(sensitivitySelectionAtom) !== null;

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries =
        tableType === TableType.STATISTICAL &&
        !isSensitivityModeActive &&
        areSelectedTablesComparable &&
        areTableDefinitionSelectionsValid;

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
 * delta ensembles client-side from their per-realization difference. In sensitivity mode regular
 * ensembles are also aggregated client-side, per case.
 */
export const statisticalTableDataResultsAtom = atom((get) => {
    const delta = get(deltaPerRealizationTableDataResultsAtom);

    // A disabled query can still return cached data, so the backend result is ignored in sensitivity mode.
    const regular =
        get(sensitivitySelectionAtom) !== null
            ? toStatisticalResults(get(regularPerRealizationTableDataWithSensitivityAtom))
            : { ...get(regularStatisticalTableDataResultsAtom), numDroppedSensitivityRows: 0 };
    const deltaTablesData = delta.tablesData.map(toStatisticalTableData);

    const tablesData = [...regular.tablesData, ...deltaTablesData];

    return {
        tablesData,
        isFetching: regular.isFetching || delta.isFetching,
        allQueriesFailed: (regular.allQueriesFailed || delta.allQueriesFailed) && tablesData.length === 0,
        errors: [...regular.errors, ...delta.errors],
        droppedFluidSelections: delta.droppedFluidSelections,
        unmatchedRows: delta.unmatchedRows,
        numDroppedSensitivityRows: regular.numDroppedSensitivityRows,
    };
});

function toStatisticalTableData(tableData: InplaceVolumesTableData): InplaceVolumesStatisticalTableData {
    return {
        ensembleIdent: tableData.ensembleIdent,
        tableName: tableData.tableName,
        data: computeStatisticalTableFromPerRealizationTableMemoized(tableData.data),
    };
}

function toStatisticalResults<T extends { tablesData: InplaceVolumesTableData[] }>(
    results: T,
): Omit<T, "tablesData"> & { tablesData: InplaceVolumesStatisticalTableData[] } {
    return { ...results, tablesData: results.tablesData.map(toStatisticalTableData) };
}
