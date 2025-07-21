import React from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { SessionMetadataWithId_api } from "@api";
import {
    getSessionsMetadataInfiniteOptions,
    getSessionsMetadataInfiniteQueryKey,
    SessionSortBy_api,
    SessionSortDirection_api,
} from "@api";
import { GuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import type { DialogProps } from "@lib/components/Dialog/dialog";
import { Table } from "@lib/components/Table";
import type { TableHeading, TableRow } from "@lib/components/Table/table";
import { formatDate } from "@lib/utils/dates";

export type SessionOverviewDialogProps = {
    workbench: Workbench;
    mode?: "";
} & Pick<DialogProps, "open" | "onClose">;

// TODO: clean up; include more fields?
const SESSION_TABLE_HEADINGS: TableHeading = {
    id: {
        label: "Id",
        sizeInPercent: 5,
        sortable: false,
    },

    name: {
        label: "Name",
        sizeInPercent: 10,
        sortable: false,
    },

    description: {
        label: "Description",
        sizeInPercent: 10,
        sortable: false,
    },

    createdAt: {
        label: "Created at",
        sizeInPercent: 10,
        sortable: true,
        formatValue(value) {
            if (typeof value !== "string") return "";

            return formatDate(new Date(value));
        },
    },

    updatedAt: {
        label: "Updated at",
        sizeInPercent: 10,
        sortable: true,
        formatValue(value) {
            if (typeof value !== "string") return "";

            return formatDate(new Date(value));
        },
    },
} as const;

type SessionTableRow = TableRow<typeof SESSION_TABLE_HEADINGS>;

const USE_ALTERNATING_COLUMN_COLORS = true;
// To avoid jumpy loads, Page size should at the least be more than the visible amount of rows.
// CosmosDB has a max size of 100 by default
const QUERY_PAGE_SIZE = 20;
const NEXT_PAGE_THRESHOLD = 1;

export function SessionOverviewDialog(props: SessionOverviewDialogProps): React.ReactNode {
    // TODO: Open via gui-events?

    const { mode, ...otherProps } = props;


    const sessionsQuery = useInfiniteQuery({
        ...getSessionsMetadataInfiniteOptions({
            query: {
                sort_by: SessionSortBy_api.UPDATED_AT,
                sort_direction: SessionSortDirection_api.DESC,
                limit: QUERY_PAGE_SIZE,
                // "page" prop gets computed by `getNextPageParam`
            },
        }),
        initialPageParam: 0,
        refetchInterval: 10000,
        enabled: otherProps.open,
        // TODO: Currently uses standard SQL pagination. Move over to continuation-tokens for better RU usage
        getNextPageParam(lastPage, pages) {
            if (lastPage.length < QUERY_PAGE_SIZE) return null;
            return pages.length;
        },
    });
    const tableRows = React.useMemo(() => {
        return makeTableRows(sessionsQuery.data?.pages?.flat());
    }, [sessionsQuery.data]);

    const onTableRowLoadedChange = React.useCallback(
        function (startIndex: number, endIndex: number) {
            if (!sessionsQuery.hasNextPage) return;
            if (sessionsQuery.isPending) return;
            if (tableRows.length - endIndex <= NEXT_PAGE_THRESHOLD) {
                sessionsQuery.fetchNextPage();
            }
        },
        [sessionsQuery, tableRows],
    );

    return (
        <Dialog title="Open Session" modal {...otherProps}>
            <div className="flex gap-2 mb-2 items-center">
                <div className="justify-self-end ml-auto block">
                    <Button name="Refetch data" color="primary" onClick={() => sessionsQuery.refetch()}>
                        <Refresh fontSize="inherit" />
                    </Button>
                </div>
            </div>
            <Table
                headings={SESSION_TABLE_HEADINGS}
                data={tableRows}
                alternatingColumnColors={USE_ALTERNATING_COLUMN_COLORS}
                height={400}
                highlightFilter={selectedSessionHighlightFilter}
                onClick={handleClickRow}
                onRowLoadedRangeChange={onTableRowLoadedChange}
            />
        </Dialog>
    );
}

function makeTableRows(sessions: SessionMetadataWithId_api[] | undefined) {
    const rows = [] as SessionTableRow[];

    for (const session of sessions ?? []) {
        rows.push({
            id: session.id,
            name: session.title,
            description: session.description,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        });
    }

    return rows;
}
