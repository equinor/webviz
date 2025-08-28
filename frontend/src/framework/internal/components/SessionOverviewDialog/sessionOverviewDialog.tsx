import React from "react";

import { Add, Delete, Edit, FileOpen, Refresh } from "@mui/icons-material";
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
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import type { DialogProps } from "@lib/components/Dialog/dialog";
import { Table } from "@lib/components/Table";
import type { TableHeading, TableRow } from "@lib/components/Table/table";
import { formatDate } from "@lib/utils/dates";

import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";

export type SessionOverviewDialogProps = {
    workbench: Workbench;
    onNewSession?: () => void;
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
const QUERY_PAGE_SIZE = 2;
const NEXT_PAGE_THRESHOLD = 1;

export function SessionOverviewDialog(props: SessionOverviewDialogProps): React.ReactNode {
    // TODO: Open via gui-events?

    const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);

    const [metadataEditOpen, setMetadataEditOpen] = React.useState(false);

    // TODO
    const [sortingCol, setSortingCol] = React.useState(SessionSortBy_api.UPDATED_AT);
    const [sortingDirection, setSortingDirection] = React.useState(SessionSortDirection_api.DESC);

    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const handleClickRow = React.useCallback(function handleClickRow(row: SessionTableRow) {
        if (typeof row.id !== "string") throw Error("Expected string value for row id");

        setSelectedSessionId((prev) => {
            if (prev === row.id) return null;
            return row.id as string;
        });
    }, []);

    async function navigateToSelectedSession() {
        if (!selectedSessionId) return;

        // Load the selected snapshot
        // TODO: Make this to a workbench method?
        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, true);

        history.pushState(null, "", `/session/${selectedSessionId}`);
        await props.workbench.handleNavigation();

        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, false);
        // Reset query so that the session list is correct afterwards are fetched when we return to the start page
        props.workbench.getQueryClient().resetQueries({ queryKey: getSessionsMetadataInfiniteQueryKey() });
    }

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
        // refetchInterval: 10000,
        enabled: props.open,
        // TODO: Currently uses standard SQL pagination. Move over to continuation-tokens for better RU usage
        getNextPageParam(lastPage, pages) {
            if (lastPage.length < QUERY_PAGE_SIZE) return null;
            return pages.length;
        },
    });

    async function deleteSelectedSession() {
        if (!selectedSessionId) return;

        setDeletePending(true);

        await props.workbench.deleteSession(selectedSessionId);

        setSelectedSessionId(null);
        sessionsQuery.refetch();

        setDeletePending(false);
    }

    async function editSelectedSession() {
        if (!selectedSessionId) return;

        setMetadataEditOpen(true);
    }

    const actions = (
        <>
            <Button color="danger" disabled={!selectedSessionId || deletePending} onClick={deleteSelectedSession}>
                {deletePending ? <CircularProgress /> : <Delete fontSize="inherit" />} Delete
            </Button>
            <Button color="primary" disabled={!selectedSessionId} onClick={editSelectedSession}>
                <Edit fontSize="inherit" /> Edit
            </Button>

            <Button color="primary" disabled={!selectedSessionId} onClick={navigateToSelectedSession}>
                <FileOpen fontSize="inherit" /> Open
            </Button>
            <Button color="primary" variant="contained" onClick={props.onNewSession}>
                <Add fontSize="inherit" /> New session
            </Button>
        </>
    );

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

    const selectedSessionHighlightFilter = React.useCallback(
        (row: SessionTableRow) => row.id === selectedSessionId,
        [selectedSessionId],
    );

    const selectedSession = React.useMemo(() => {
        return sessionsQuery.data?.pages?.flat()?.find((session) => session.id === selectedSessionId) || null;
    }, [sessionsQuery.data?.pages, selectedSessionId]);

    return (
        <>
            <Dialog title="Open Session" modal {...props} actions={actions}>
                <div className="flex gap-2 mb-2 items-center">
                    <span className="inline-block text-xs text-gray-500 px-1 py-0.5 rounded italic ">
                        {sessionsQuery.hasNextPage ? "There is more data" : "All data loaded"}
                    </span>

                    <div className="justify-self-end ml-auto block">
                        <Button name="Refetch data" color="primary" onClick={() => sessionsQuery.refetch()}>
                            <Refresh fontSize="inherit" />
                        </Button>
                    </div>
                </div>

                {sessionsQuery.isFetched && !tableRows.length ? (
                    <p className="text-gray-600 italic text-lg">No sessions have been made</p>
                ) : (
                    <Table
                        headings={SESSION_TABLE_HEADINGS}
                        data={tableRows}
                        alternatingColumnColors={USE_ALTERNATING_COLUMN_COLORS}
                        height={400}
                        highlightFilter={selectedSessionHighlightFilter}
                        onClick={handleClickRow}
                        onRowLoadedRangeChange={onTableRowLoadedChange}
                    />
                )}
            </Dialog>

            {selectedSession && (
                <EditSessionMetadataDialog
                    workbench={props.workbench}
                    sessionId={selectedSession.id}
                    sessionMetadata={selectedSession}
                    open={metadataEditOpen}
                    onClose={() => setMetadataEditOpen(false)}
                />
            )}
        </>
    );
}

// function MetadataEditWrapper(props: {
//     selectedSession: SessionMetadataWithId_api | null;
//     onUpdated: (updatedMetadata: SessionMetadataWithId_api) => void;
// }): React.ReactNode {
//     if (!props.selectedSession) return null;

//     return <EditSessionMetadataDialog sessionId={selectedSession.id}  />;
// }

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
