import type React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { convertRowsToCsvContentString } from "@lib/utils/csvConvertUtils";
import { createTimestampedFilename, downloadTextFile } from "@lib/utils/downloadUtils";
import { InplaceVolumesTable } from "@modules/InplaceVolumesTable/view/components/inplaceVolumesTable";
import type { TableColumnsConfig, TableRow } from "@modules/InplaceVolumesTable/view/types";
import { buildCsvRowsFromTable } from "@modules/InplaceVolumesTable/view/utils/csvExportUtils";

// NOTE: fixture builders live in ./inplaceVolumesTableFixtures.ts, not this file - co-locating them
// with the mounted component here breaks Playwright CT's component-index bundling ("Identifier ...
// has already been declared").
export type InplaceVolumesTableHarnessProps = {
    columnsConfig: TableColumnsConfig;
    rows: TableRow<TableColumnsConfig>[];
    mode: "realization" | "statistical";
};

const ensembleSet = new EnsembleSet([]);

export function InplaceVolumesTableHarness(props: InplaceVolumesTableHarnessProps): React.ReactNode {
    function handleDownload(rows: TableRow<TableColumnsConfig>[]) {
        const csvRows = buildCsvRowsFromTable(props.columnsConfig, rows, ensembleSet);
        const content = convertRowsToCsvContentString(csvRows);
        const modeSuffix = props.mode === "realization" ? "Realizations" : "Statistics";
        const filename = createTimestampedFilename(`InplaceVolumesTable_${modeSuffix}`, "csv");
        downloadTextFile(content, filename, "text/csv;charset=utf-8");
    }

    return (
        <div style={{ height: 400 }}>
            <InplaceVolumesTable
                ensembleSet={ensembleSet}
                columnsConfig={props.columnsConfig}
                rows={props.rows}
                onHover={() => {}}
                onDownload={handleDownload}
            />
        </div>
    );
}
