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

/** Return all statistics, like the backend. The view chooses which ones to show. */
const ALL_STATISTICS = Object.values(InplaceVolumesStatistic_api);

function computeStatisticalFluidSelectionTableData(
    perRealizationData: InplaceVolumesTableData_api,
): InplaceVolumesStatisticalTableData_api {
    // Group by the other selectors, then compute statistics across realizations.
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
    for (let row = 0; row < rowCount; row++) {
        const groupKey = makeRowKey(selectorRowValues, groupSelectorColumnNames, row);
        let rowIndices = rowIndicesByGroupKey.get(groupKey);
        if (!rowIndices) {
            rowIndices = [];
            rowIndicesByGroupKey.set(groupKey, rowIndices);
        }
        rowIndices.push(row);
    }
    const rowIndicesPerGroup = Array.from(rowIndicesByGroupKey.values());

    const selectorColumns: RepeatedTableColumnData_api[] = groupSelectorColumns.map(
        function encodeGroupSelector(column) {
            const rowValues = selectorRowValues.get(column.columnName)!;
            return encodeSelectorColumn(
                column.columnName,
                rowIndicesPerGroup.map((rowIndices) => rowValues[rowIndices[0]]),
            );
        },
    );

    const resultColumnStatistics: TableColumnStatisticalData_api[] = perRealizationData.resultColumns.map(
        function computeResultColumnStatistics(column) {
            const statisticValues: TableColumnStatisticalData_api["statisticValues"] = {};
            for (const statistic of ALL_STATISTICS) {
                statisticValues[statistic] = [];
            }

            for (const rowIndices of rowIndicesPerGroup) {
                const values = rowIndices.map((row) => column.columnValues[row]);
                const computedStatistics = computeStatistics(values);

                for (const statistic of ALL_STATISTICS) {
                    statisticValues[statistic]!.push(computedStatistics[STATISTIC_TO_FIELD[statistic]]);
                }
            }

            return { columnName: column.columnName, statisticValues };
        },
    );

    return {
        fluidSelection: perRealizationData.fluidSelection,
        selectorColumns,
        resultColumnStatistics,
    };
}

/**
 * Compute statistics across realizations, keeping a separate group for each set of selector values.
 *
 * Delta tables use this because the backend cannot compute statistics for a client-side difference.
 */
export function computeStatisticalTableFromPerRealizationTable(
    perRealizationData: InplaceVolumesTableDataPerFluidSelection_api,
): InplaceVolumesStatisticalTableDataPerFluidSelection_api {
    return {
        tableDataPerFluidSelection: perRealizationData.tableDataPerFluidSelection.map(
            computeStatisticalFluidSelectionTableData,
        ),
    };
}

const resultByData = new WeakMap<
    InplaceVolumesTableDataPerFluidSelection_api,
    InplaceVolumesStatisticalTableDataPerFluidSelection_api
>();

/**
 * Reuse the statistics while the input object is unchanged.
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
