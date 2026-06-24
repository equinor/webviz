import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { StatusWrapper } from "@lib/newComponents/StatusWrapper";

import type { Interfaces } from "../interfaces";

import { areSelectedTablesComparableAtom, haveAllQueriesFailedAtom, isQueryFetchingAtom } from "./atoms/derivedAtoms";
import { InplaceVolumesTable } from "./components/inplaceVolumesTable";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useTableBuilder } from "./hooks/useTableBuilder";
import type { TableColumnsConfig, TableRow } from "./types";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const haveAllQueriesFailed = useAtomValue(haveAllQueriesFailedAtom);
    const isQueryFetching = useAtomValue(isQueryFetchingAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);

    useMakeViewStatusWriterMessages(statusWriter);
    statusWriter.setLoading(isQueryFetching);

    // Build table headings and rows
    const { headings: tableColumnConfig, tableRows } = useTableBuilder();

    const handleTableHover = React.useCallback(
        function handleTableHover(row: TableRow<TableColumnsConfig> | null) {
            if (!row) {
                props.workbenchServices.publishGlobalData("global.hoverRegion", null);
                props.workbenchServices.publishGlobalData("global.hoverZone", null);
                props.workbenchServices.publishGlobalData("global.hoverFacies", null);
                return;
            }

            const regionColumnKey = Object.keys(row).find((key) => key.toUpperCase() === "REGION");
            if (regionColumnKey) {
                const regionName = row[regionColumnKey]?.toString();
                if (regionName) {
                    props.workbenchServices.publishGlobalData("global.hoverRegion", { regionName });
                }
            }
            const zoneColumnKey = Object.keys(row).find((key) => key.toUpperCase() === "ZONE");
            if (zoneColumnKey) {
                const zoneName = row[zoneColumnKey]?.toString();
                if (zoneName) {
                    props.workbenchServices.publishGlobalData("global.hoverZone", { zoneName });
                }
            }
            const faciesColumnKey = Object.keys(row).find((key) => key.toUpperCase() === "FACIES");
            if (faciesColumnKey) {
                const faciesName = row[faciesColumnKey]?.toString();
                if (faciesName) {
                    props.workbenchServices.publishGlobalData("global.hoverFacies", { faciesName });
                }
            }
        },
        [props.workbenchServices],
    );

    function createErrorMessage(): string | null {
        if (haveAllQueriesFailed) {
            return "Failed to load inplace volumes table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected inplace volumes tables are not comparable due to mismatching fluids, result names or index columns";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = isQueryFetching && areSelectedTablesComparable;

    return (
        <StatusWrapper className="h-full" isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
            <InplaceVolumesTable
                columnsConfig={tableColumnConfig}
                rows={tableRows}
                onHover={handleTableHover}
                ensembleSet={ensembleSet}
            />
        </StatusWrapper>
    );
}
