import { EnsembleSet } from "@framework/EnsembleSet";
import { TableHeading, TableRow } from "@lib/components/Table/table";
import { TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { useAtomValue } from "jotai";

import { statisticOptionsAtom, tableTypeAtom } from "../atoms/baseAtoms";
import { perRealizationTableDataResultsAtom, statisticalTableDataResultsAtom } from "../atoms/queryAtoms";
import {
    createStatisticalTableHeadingsAndRowsFromTablesData,
    createTableHeadingsAndRowsFromTablesData,
} from "../utils/tableComponentUtils";

export function useTableBuilder(ensembleSet: EnsembleSet): { headings: TableHeading; tableRows: TableRow<any>[] } {
    let headings: TableHeading = {};
    let tableRows: TableRow<any>[] = [];

    const tableType = useAtomValue(tableTypeAtom);
    const statisticOptions = useAtomValue(statisticOptionsAtom);
    const perRealizationTableDataResults = useAtomValue(perRealizationTableDataResultsAtom);
    const statisticalTableDataResults = useAtomValue(statisticalTableDataResultsAtom);

    if (tableType === TableType.PER_REALIZATION) {
        const tableHeadingsAndRows = createTableHeadingsAndRowsFromTablesData(
            perRealizationTableDataResults.tablesData,
            ensembleSet
        );
        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;

        return { headings, tableRows };
    } else if (tableType === TableType.STATISTICAL) {
        const tableHeadingsAndRows = createStatisticalTableHeadingsAndRowsFromTablesData(
            statisticalTableDataResults.tablesData,
            statisticOptions,
            ensembleSet
        );

        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;

        return { headings, tableRows };
    }

    throw new Error("Not able to build table - Table type not supported");
}
