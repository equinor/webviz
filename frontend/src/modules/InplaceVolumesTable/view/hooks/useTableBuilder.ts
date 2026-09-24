import React from "react";

import { useAtomValue } from "jotai";

import { TableType } from "@modules/_shared/InplaceVolumes/types";
import { StatisticsLayout } from "@modules/InplaceVolumesTable/types";

import { filterAtom, statisticOptionsAtom, statisticsLayoutAtom, tableTypeAtom } from "../atoms/baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "../atoms/queryAtoms";
import type { TableColumnsConfig, TableRow } from "../types";
import {
    createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData,
    createStatisticalTableHeadingsAndRowsFromTablesData,
    createTableHeadingsAndRowsFromTablesData,
    RESPONSE_COLUMN_KEY,
    sortTableRowsByCategoryOrder,
} from "../utils/tableComponentUtils";
import { sortStatisticsForDisplay } from "../utils/tableLayoutUtils";

export function useTableBuilder(): {
    headings: TableColumnsConfig;
    tableRows: TableRow<TableColumnsConfig>[];
    sortScopeColumnKey?: string;
} {
    const tableType = useAtomValue(tableTypeAtom);
    const statisticOptions = useAtomValue(statisticOptionsAtom);
    const statisticsLayout = useAtomValue(statisticsLayoutAtom);
    const filter = useAtomValue(filterAtom);
    const perRealizationTablesData = useAtomValue(perRealizationTableDataResultsAtom).tablesData;
    const statisticalTablesData = useAtomValue(statisticalTableDataResultsAtom).tablesData;
    const indicesWithValues = filter.indicesWithValues;

    // Rows get fresh ids when rebuilt, so rebuilding on every render would remount all table rows
    return React.useMemo(() => {
        const categoryOrder = new Map(indicesWithValues.map((index) => [index.indexColumn, index.values]));

        if (tableType === TableType.PER_REALIZATION) {
            const { headings, rows } = createTableHeadingsAndRowsFromTablesData(perRealizationTablesData);
            return { headings, tableRows: sortTableRowsByCategoryOrder(rows, headings, categoryOrder) };
        }

        if (tableType === TableType.STATISTICAL) {
            const isResponsesAsRows = statisticsLayout === StatisticsLayout.RESPONSES_AS_ROWS;
            const buildHeadingsAndRows = isResponsesAsRows
                ? createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData
                : createStatisticalTableHeadingsAndRowsFromTablesData;
            const { headings, rows } = buildHeadingsAndRows(
                statisticalTablesData,
                sortStatisticsForDisplay(statisticOptions),
            );

            return {
                headings,
                tableRows: sortTableRowsByCategoryOrder(rows, headings, categoryOrder),
                sortScopeColumnKey: isResponsesAsRows ? RESPONSE_COLUMN_KEY : undefined,
            };
        }

        throw new Error("Not able to build table - Table type not supported");
    }, [
        tableType,
        statisticOptions,
        statisticsLayout,
        indicesWithValues,
        perRealizationTablesData,
        statisticalTablesData,
    ]);
}
