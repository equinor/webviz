import React from "react";

import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { toastManager } from "@framework/toastManager";
import { convertRowsToCsvContentString } from "@lib/utils/csvConvertUtils";
import { createTimestampedFilename, downloadTextFile } from "@lib/utils/downloadUtils";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { tableTypeAtom } from "../atoms/baseAtoms";
import { haveSomeQueriesFailedAtom } from "../atoms/derivedAtoms";
import type { TableColumnsConfig, TableRow } from "../types";
import { buildCsvRowsFromTable } from "../utils/csvExportUtils";
import { collectLeafColumns } from "../utils/tableComponentUtils";

export function useDownloadCsv(
    columnsConfig: TableColumnsConfig,
    ensembleSet: EnsembleSet,
): (rows: TableRow<TableColumnsConfig>[]) => void {
    const tableType = useAtomValue(tableTypeAtom);
    const haveSomeQueriesFailed = useAtomValue(haveSomeQueriesFailedAtom);

    return React.useCallback(
        function handleDownloadCsv(rows: TableRow<TableColumnsConfig>[]) {
            if (rows.length === 0 || collectLeafColumns(columnsConfig).length === 0) {
                return;
            }

            try {
                const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);
                const content = convertRowsToCsvContentString(csvRows);

                const modeSuffix = tableType === TableType.PER_REALIZATION ? "Realizations" : "Statistics";
                const filename = createTimestampedFilename(`InplaceVolumesTable_${modeSuffix}`, "csv");

                downloadTextFile(content, filename, "text/csv;charset=utf-8");

                toastManager.add({ title: filename, type: "success", timeout: 3000 });

                if (haveSomeQueriesFailed) {
                    toastManager.add({
                        title: "Some selected tables failed to load – the download contains only the displayed data",
                        type: "warning",
                        timeout: 5000,
                    });
                }
            } catch (error) {
                console.error("Error assembling or downloading Inplace Volumes Table CSV:", error);
                toastManager.add({ title: "Failed Inplace Volumes Table download", type: "error", timeout: 5000 });
            }
        },
        [columnsConfig, ensembleSet, tableType, haveSomeQueriesFailed],
    );
}
