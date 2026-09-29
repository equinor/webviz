import { atom } from "jotai";

import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    makeAggregatedPerRealizationDeltaTableDataQueryOptions,
    makeAggregatedPerRealizationTableDataQueryOptions,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { addSensitivityColumnToPerRealizationDataMemoized } from "@modules/_shared/InplaceVolumes/sensitivityUtils";

import { areTableDefinitionSelectionsValidAtom, resultNameAtom } from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    deltaEnsembleIdentsWithRealizationsAtom,
    ensembleIdentsWithRealizationsAtom,
    groupByIndicesAtom,
    indicesWithValuesAtom,
    realizationToSensitivityCaseLabelMapAtom,
    tableNamesAtom,
} from "./derivedAtoms";

const regularAggregatedTableDataQueriesAtom = atomWithQueries((get) => {
    const resultName = get(resultNameAtom);

    const resultNames: string[] = [];
    if (resultName !== null) {
        resultNames.push(resultName);
    }

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries = areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return makeAggregatedPerRealizationTableDataQueryOptions(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});

const deltaAggregatedTableDataQueriesAtom = atomWithQueries((get) => {
    const resultName = get(resultNameAtom);

    const resultNames: string[] = [];
    if (resultName !== null) {
        resultNames.push(resultName);
    }

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const deltaEnsembleIdentsWithRealizations = get(deltaEnsembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

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

/**
 * Merged per-realization table data for both regular and delta ensembles. Delta ensembles carry
 * the client-side computed difference (comparison − reference).
 */
export const aggregatedTableDataQueriesAtom = atom((get) => {
    const regular = get(regularAggregatedTableDataQueriesAtom);
    const delta = get(deltaAggregatedTableDataQueriesAtom);
    const realizationToSensitivityCaseLabel = get(realizationToSensitivityCaseLabelMapAtom);

    let numDroppedSensitivityRows = 0;
    const regularTablesData = realizationToSensitivityCaseLabel
        ? regular.tablesData.map((tableData) => {
              const result = addSensitivityColumnToPerRealizationDataMemoized(
                  tableData.data,
                  realizationToSensitivityCaseLabel,
              );
              numDroppedSensitivityRows += result.numDroppedRows;
              return { ...tableData, data: result.data };
          })
        : regular.tablesData;

    const tablesData = [...regularTablesData, ...delta.tablesData];

    return {
        tablesData,
        isFetching: regular.isFetching || delta.isFetching,
        // Only surface an "all failed" state when there is genuinely no data to show.
        allQueriesFailed: (regular.allQueriesFailed || delta.allQueriesFailed) && tablesData.length === 0,
        errors: [...regular.errors, ...delta.errors],
        droppedFluidSelections: delta.droppedFluidSelections,
        unmatchedRows: delta.unmatchedRows,
        numDroppedSensitivityRows,
    };
});
