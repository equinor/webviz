import React from "react";

import { InplaceVolumetricsIdentifier_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Table as TableComponent } from "@lib/components/Table";
import { TableHeading, TableRow } from "@lib/components/Table/table";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import { useAtomValue } from "jotai";

import { areSelectedTablesComparableAtom } from "./atoms/baseAtoms";
import { hasAllQueriesFailedAtom as haveAllQueriesFailedAtom, isQueryFetchingAtom } from "./atoms/derivedAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useTableBuilder } from "./hooks/useTableBuilder";

import { Interfaces } from "../interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const haveAllQueriesFailed = useAtomValue(haveAllQueriesFailedAtom);
    const isQueryFetching = useAtomValue(isQueryFetchingAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);

    useMakeViewStatusWriterMessages(statusWriter);
    statusWriter.setLoading(isQueryFetching);

    // Build table headings and rows
    const { headings, tableRows } = useTableBuilder(ensembleSet);

    const handleTableHover = React.useCallback(
        function handleTableHover(row: TableRow<TableHeading> | null) {
            if (!row) {
                props.workbenchServices.publishGlobalData("global.hoverRegion", null);
                props.workbenchServices.publishGlobalData("global.hoverZone", null);
                props.workbenchServices.publishGlobalData("global.hoverFacies", null);
                return;
            }
            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.REGION)) {
                const regionName = row[InplaceVolumetricsIdentifier_api.REGION]?.toString();
                if (regionName) {
                    props.workbenchServices.publishGlobalData("global.hoverRegion", { regionName });
                }
            }

            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.ZONE)) {
                const zoneName = row[InplaceVolumetricsIdentifier_api.ZONE]?.toString();
                if (zoneName) {
                    props.workbenchServices.publishGlobalData("global.hoverZone", { zoneName });
                }
            }

            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.FACIES)) {
                const faciesName = row[InplaceVolumetricsIdentifier_api.FACIES]?.toString();
                if (faciesName) {
                    props.workbenchServices.publishGlobalData("global.hoverFacies", { faciesName });
                }
            }
        },
        [props.workbenchServices]
    );

    function createErrorMessage(): string | null {
        if (haveAllQueriesFailed) {
            return "Failed to load volumetric table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected volumetric tables are not comparable";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = isQueryFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                <TableComponent
                    headings={headings}
                    data={tableRows}
                    height={divBoundingRect.height}
                    onHover={handleTableHover}
                    alternatingColumnColors
                />
            </PendingWrapper>
        </div>
    );
}
