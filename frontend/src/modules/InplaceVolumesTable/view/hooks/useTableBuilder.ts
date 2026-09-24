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
    let headings: TableColumnsConfig = {};
    let tableRows: TableRow<TableColumnsConfig>[] = [];

    const tableType = useAtomValue(tableTypeAtom);
    const statisticOptions = useAtomValue(statisticOptionsAtom);
    const statisticsLayout = useAtomValue(statisticsLayoutAtom);
    const filter = useAtomValue(filterAtom);
    const perRealizationTableDataResults = useAtomValue(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = useAtomValue(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        const tableHeadingsAndRows = createTableHeadingsAndRowsFromTablesData(
            perRealizationTableDataResults.tablesData,
        );
        headings = tableHeadingsAndRows.headings;
        tableRows = sortTableRowsByCategoryOrder(
            tableHeadingsAndRows.rows,
            headings,
            new Map(filter.indicesWithValues.map((index) => [index.indexColumn, index.values])),
        );

        return { headings, tableRows };
    } else if (tableType === TableType.STATISTICAL) {
        const isResponsesAsRows = statisticsLayout === StatisticsLayout.RESPONSES_AS_ROWS;
        const buildHeadingsAndRows = isResponsesAsRows
            ? createStatisticalResponsesAsRowsHeadingsAndRowsFromTablesData
            : createStatisticalTableHeadingsAndRowsFromTablesData;
        const tableHeadingsAndRows = buildHeadingsAndRows(
            statisticalTableDataResults.tablesData,
            sortStatisticsForDisplay(statisticOptions),
        );

        headings = tableHeadingsAndRows.headings;
        tableRows = sortTableRowsByCategoryOrder(
            tableHeadingsAndRows.rows,
            headings,
            new Map(filter.indicesWithValues.map((index) => [index.indexColumn, index.values])),
        );

        return { headings, tableRows, sortScopeColumnKey: isResponsesAsRows ? RESPONSE_COLUMN_KEY : undefined };
    }

    throw new Error("Not able to build table - Table type not supported");
}
