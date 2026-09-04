import type {
    InplaceVolumesStatisticalTableData_api,
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
    TableColumnStatisticalData_api,
} from "@api";
import { InplaceVolumesStatistic_api } from "@api";
import type { Statistics } from "@modules/_shared/utils/math/statistics";
import { computeStatistics } from "@modules/_shared/utils/math/statistics";

import { encodeSelectorColumn, expandSelectorColumn, makeRowKey } from "./selectorColumnUtils";

const REAL_COLUMN_NAME = "REAL";

const STATISTIC_TO_FIELD: Record<InplaceVolumesStatistic_api, keyof Statistics> = {
    [InplaceVolumesStatistic_api.MEAN]: "mean",
    [InplaceVolumesStatistic_api.STDDEV]: "stdDev",
    [InplaceVolumesStatistic_api.MIN]: "min",
    [InplaceVolumesStatistic_api.MAX]: "max",
    [InplaceVolumesStatistic_api.P10]: "p10",
    [InplaceVolumesStatistic_api.P90]: "p90",
};

/** The backend always returns every statistic and lets the view filter, so match that. */
const ALL_STATISTICS = Object.values(InplaceVolumesStatistic_api);

function computeStatisticalFluidSelectionTableData(
    perRealizationData: InplaceVolumesTableData_api,
): InplaceVolumesStatisticalTableData_api {
    // Statistics are computed across realizations, so REAL is what the rows collapse over.
    const groupSelectorColumns = perRealizationData.selectorColumns.filter(
        (column) => column.columnName !== REAL_COLUMN_NAME,
    );
    const groupSelectorColumnNames = groupSelectorColumns.map((column) => column.columnName);

    const selectorRowValues = new Map<string, (string | number)[]>();
    for (const column of groupSelectorColumns) {
        selectorRowValues.set(column.columnName, expandSelectorColumn(column));
    }

    const rowCount = perRealizationData.resultColumns[0]?.columnValues.length ?? 0;
    const rowIndicesByGroupKey = new Map<string, number[]>();
    const groupKeysInOrder: string[] = [];
    for (let row = 0; row < rowCount; row++) {
        const groupKey = makeRowKey(selectorRowValues, groupSelectorColumnNames, row);
        let rowIndices = rowIndicesByGroupKey.get(groupKey);
        if (!rowIndices) {
            rowIndices = [];
            rowIndicesByGroupKey.set(groupKey, rowIndices);
            groupKeysInOrder.push(groupKey);
        }
        rowIndices.push(row);
    }
    const rowIndicesPerGroup = groupKeysInOrder.map((groupKey) => rowIndicesByGroupKey.get(groupKey)!);

    const selectorColumns: RepeatedTableColumnData_api[] = groupSelectorColumns.map((column) => {
        const rowValues = selectorRowValues.get(column.columnName)!;
        return encodeSelectorColumn(
            column.columnName,
            rowIndicesPerGroup.map((rowIndices) => rowValues[rowIndices[0]]),
        );
    });

    const resultColumnStatistics: TableColumnStatisticalData_api[] = perRealizationData.resultColumns.map((column) => {
        const statisticValues: TableColumnStatisticalData_api["statisticValues"] = {};
        for (const statistic of ALL_STATISTICS) {
            statisticValues[statistic] = [];
        }

        for (const rowIndices of rowIndicesPerGroup) {
            // The backend drops nulls and NaNs before aggregating, so do the same here.
            const values = rowIndices.map((row) => column.columnValues[row]).filter((value) => Number.isFinite(value));
            const computedStatistics = computeStatistics(values);

            for (const statistic of ALL_STATISTICS) {
                statisticValues[statistic]!.push(computedStatistics[STATISTIC_TO_FIELD[statistic]]);
            }
        }

        return { columnName: column.columnName, statisticValues };
    });

    return {
        fluidSelection: perRealizationData.fluidSelection,
        selectorColumns,
        resultColumnStatistics,
    };
}

/**
 * Aggregate per-realization inplace volumes data into statistics, grouped by every selector column
 * except REAL.
 *
 * Needed for delta ensembles: the backend cannot aggregate a difference, so the difference is
 * computed per realization client-side and reduced to statistics here.
 */
export function computeStatisticalTableFromPerRealizationTable(
    perRealizationData: InplaceVolumesTableDataPerFluidSelection_api,
): InplaceVolumesStatisticalTableDataPerFluidSelection_api {
    return {
        tableDataPerFluidSelection: perRealizationData.tableDataPerFluidSelection.map((fluidSelectionData) =>
            computeStatisticalFluidSelectionTableData(fluidSelectionData),
        ),
    };
}

const resultByData = new WeakMap<
    InplaceVolumesTableDataPerFluidSelection_api,
    InplaceVolumesStatisticalTableDataPerFluidSelection_api
>();

/**
 * `computeStatisticalTableFromPerRealizationTable` memoized on the input identity, so it is not
 * redone when a query result object is rebuilt for an unrelated reason.
 */
export function computeStatisticalTableFromPerRealizationTableMemoized(
    perRealizationData: InplaceVolumesTableDataPerFluidSelection_api,
): InplaceVolumesStatisticalTableDataPerFluidSelection_api {
    const cachedResult = resultByData.get(perRealizationData);
    if (cachedResult) {
        return cachedResult;
    }

    const result = computeStatisticalTableFromPerRealizationTable(perRealizationData);
    resultByData.set(perRealizationData, result);
    return result;
}
