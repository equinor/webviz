import { useAtomValue } from "jotai";

import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { statisticOptionsAtom, tableTypeAtom } from "../atoms/baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "../atoms/queryAtoms";
import type { TableColumnsConfig, TableRow } from "../types";
import {
    createStatisticalTableHeadingsAndRowsFromTablesData,
    createTableHeadingsAndRowsFromTablesData,
} from "../utils/tableComponentUtils";

export function useTableBuilder(): {
    headings: TableColumnsConfig;
    tableRows: TableRow<TableColumnsConfig>[];
} {
    let headings: TableColumnsConfig = {};
    let tableRows: TableRow<TableColumnsConfig>[] = [];

    const tableType = useAtomValue(tableTypeAtom);
    const statisticOptions = useAtomValue(statisticOptionsAtom);
    const perRealizationTableDataResults = useAtomValue(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = useAtomValue(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        const tableHeadingsAndRows = createTableHeadingsAndRowsFromTablesData(
            perRealizationTableDataResults.tablesData,
        );
        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;

        return { headings, tableRows };
    } else if (tableType === TableType.STATISTICAL) {
        const tableHeadingsAndRows = createStatisticalTableHeadingsAndRowsFromTablesData(
            statisticalTableDataResults.tablesData,
            statisticOptions,
        );

        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;

        return { headings, tableRows };
    }

    throw new Error("Not able to build table - Table type not supported");
}
