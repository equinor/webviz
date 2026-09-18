import { useAtomValue } from "jotai";

import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { filterAtom, statisticOptionsAtom, tableTypeAtom } from "../atoms/baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "../atoms/queryAtoms";
import type { TableColumnsConfig, TableRow } from "../types";
import {
    createStatisticalTableHeadingsAndRowsFromTablesData,
    createTableHeadingsAndRowsFromTablesData,
    sortTableRowsByCategoryOrder,
} from "../utils/tableComponentUtils";

type TableBuilderResult = {
    headings: TableColumnsConfig;
    tableRows: TableRow<TableColumnsConfig>[];
};

export function useTableBuilder(): TableBuilderResult {
    const tableType = useAtomValue(tableTypeAtom);
    const statisticOptions = useAtomValue(statisticOptionsAtom);
    const filter = useAtomValue(filterAtom);
    const perRealizationTableDataResults = useAtomValue(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = useAtomValue(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        const tableHeadingsAndRows = createTableHeadingsAndRowsFromTablesData(
            perRealizationTableDataResults.tablesData,
        );

        return {
            headings: tableHeadingsAndRows.headings,
            tableRows: sortTableRowsByCategoryOrder(
                tableHeadingsAndRows.rows,
                tableHeadingsAndRows.headings,
                new Map(filter.indicesWithValues.map((index) => [index.indexColumn, index.values])),
            ),
        };
    } else if (tableType === TableType.STATISTICAL) {
        const tableHeadingsAndRows = createStatisticalTableHeadingsAndRowsFromTablesData(
            statisticalTableDataResults.tablesData,
            statisticOptions,
        );

        return {
            headings: tableHeadingsAndRows.headings,
            tableRows: sortTableRowsByCategoryOrder(
                tableHeadingsAndRows.rows,
                tableHeadingsAndRows.headings,
                new Map(filter.indicesWithValues.map((index) => [index.indexColumn, index.values])),
            ),
        };
    }

    throw new Error("Not able to build table - Table type not supported");
}
