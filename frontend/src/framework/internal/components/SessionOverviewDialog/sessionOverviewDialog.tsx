import React from "react";

import type { Options } from "@hey-api/client-axios";
import { Add, Delete, Edit, FileOpen } from "@mui/icons-material";
import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import type {
    GetSessionsMetadataData_api,
    GetSessionsMetadataError_api,
    SessionMetadataWithId_api,
    SortDirection_api,
} from "@api";
import { getSessionsMetadata, SessionSortBy_api } from "@api";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import type { DialogProps } from "@lib/components/Dialog/dialog";
import { Table } from "@lib/components/Table";
import type { TableSorting, TableColumns } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
import { formatDate } from "@lib/utils/dates";

import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";

export type SessionOverviewDialogProps = {
    workbench: Workbench;
    onNewSession?: () => void;
} & Pick<DialogProps, "open" | "onClose">;

// To avoid jumpy loads, Page size should at the least be more than the visible amount of rows.
// CosmosDB has a max size of 100 by default
const QUERY_PAGE_SIZE = 8;
const ROW_HEIGHT = 46;
const NEXT_PAGE_THRESHOLD = 1;
const USE_ALTERNATING_COLUMN_COLORS = false;

const TABLE_COLUMNS: TableColumns<SessionMetadataWithId_api> = [
    {
        _type: "data",
        columnId: "title",
        label: "Title",
        sizeInPercent: 20,
        filter: false,
    },
    {
        _type: "data",
        columnId: "description",
        label: "Description",
        sizeInPercent: 50,
        filter: false,
        sortable: false,
    },

    // TODO - Future work: Could be nice to show/filter on modules used, but need backend changes and virtual table columns to support that
    // {
    //     _type: "virtual",
    //     columnId: "modules" as keyof SessionMetadataWithId_api,
    //     label: "Modules",
    //     sizeInPercent: 15,
    //     filter: false,
    // },
    {
        _type: "data",
        columnId: "updatedAt",
        label: "Updated at",
        sizeInPercent: 15,
        filter: false,
        formatValue: (value) => {
            return formatDate(new Date(value));
        },
    },
    {
        _type: "data",
        columnId: "createdAt",
        label: "Created at",
        sizeInPercent: 15,
        filter: false,
        formatValue: (value) => {
            return formatDate(new Date(value));
        },
    },
];

function columnIdToApiSortField(columnId: string): SessionSortBy_api {
    switch (columnId) {
        case "title":
            return SessionSortBy_api.TITLE_LOWER;
        case "updatedAt":
            return SessionSortBy_api.UPDATED_AT;
        case "createdAt":
            return SessionSortBy_api.CREATED_AT;

        default:
            throw new Error(`Unknown columnId: ${columnId}`);
    }
}

function tableSortDirToApiSortDir(sort: TableSortDirection): SortDirection_api {
    return sort as unknown as SortDirection_api;
}

// ! We need to manually write out the query because hey-api generates keys in a way that messes with Tanstack's
// ! ability to set query data (which we use after mutating metadata).
/* 
! You'd think this would work, but if I try this; the data never loads
useInfiniteQuery({
    ...getSessionsMetadataInfiniteOptions( ... ),
    queryKey: ["getSessionsMetadata", "infinite", querySortParams?.sort_by, querySortParams?.sort_direction],
    ...
});
*/
function useInfiniteSessionMetadataQuery(
    querySortParams: Options<GetSessionsMetadataData_api>["query"],
    modalOpen: boolean | undefined,
) {
    return useInfiniteQuery<
        SessionMetadataWithId_api[],
        AxiosError<GetSessionsMetadataError_api>,
        InfiniteData<SessionMetadataWithId_api[]>,
        readonly unknown[],
        number
    >({
        queryKey: ["getSessionsMetadata", "infinite", querySortParams?.sort_by, querySortParams?.sort_direction],
        initialPageParam: 0,
        refetchInterval: 10000,
        enabled: modalOpen,
        // TODO: Currently uses standard SQL pagination. Move over to continuation-tokens for better RU usage
        getNextPageParam(lastPage, pages) {
            if (lastPage.length < QUERY_PAGE_SIZE) return null;
            return pages.length;
        },
        async queryFn({ pageParam, signal }) {
            const { data } = await getSessionsMetadata({
                signal,
                throwOnError: true,
                query: {
                    ...querySortParams,
                    limit: QUERY_PAGE_SIZE,
                    page: pageParam,
                },
            });

            return data;
        },
    });
}

export function SessionOverviewDialog(props: SessionOverviewDialogProps): React.ReactNode {
    // ? Should this be opened via gui-events?

    const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);
    const [metadataEditOpen, setMetadataEditOpen] = React.useState(false);
    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableSortState, setTableSortState] = React.useState<TableSorting>([
        { columnId: "updatedAt", direction: TableSortDirection.DESC },
    ]);

    const querySortParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        if (!tableSortState?.length) return undefined;

        const sortBy = columnIdToApiSortField(tableSortState[0].columnId);
        const SortDirection = tableSortDirToApiSortDir(tableSortState[0].direction);

        return {
            sort_by: sortBy,
            sort_direction: SortDirection,
        };
    }, [tableSortState]);

    const sessionsQuery = useInfiniteSessionMetadataQuery(querySortParams, props.open);

    const tableRows = React.useMemo(() => {
        if (!sessionsQuery.data) return [];
        return sessionsQuery.data?.pages?.flat();
    }, [sessionsQuery.data]);

    const onTableScrollIndexChange = React.useCallback((start: number, end: number) => {
        setVisibleRowRange({ start, end });
    }, []);

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

    async function navigateToSelectedSession() {
        if (!selectedSessionId) return;

        props.workbench.openSession(selectedSessionId);
    }

    React.useEffect(
        function maybeRefetchNextPageEffect() {
            if (!visibleRowRange || visibleRowRange.end === -1) return;
            if (!sessionsQuery.hasNextPage) return;
            if (sessionsQuery.isFetchingNextPage) return;
            if (tableRows.length - visibleRowRange?.end <= NEXT_PAGE_THRESHOLD) {
                sessionsQuery.fetchNextPage();
            }
        },
        [sessionsQuery, tableRows.length, visibleRowRange],
    );

    const selectedSession = React.useMemo(() => {
        return sessionsQuery.data?.pages?.flat()?.find((session) => session.id === selectedSessionId) || null;
    }, [sessionsQuery.data?.pages, selectedSessionId]);

    const actions = (
        <>
            <Button color="danger" disabled={!selectedSessionId || deletePending} onClick={deleteSelectedSession}>
                {deletePending ? <CircularProgress size="small" /> : <Delete fontSize="inherit" />} Delete
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

    return (
        <>
            <Dialog title="Sessions" modal {...props} actions={actions} width={1500}>
                {/* ? Do we want a button to refresh the table manually? Don't know where I'd place it... 
                <Button
                    className=" float-right text-sm !px-2 !py-1"
                    name="Refetch data"
                    color="primary"
                    onClick={() => sessionsQuery.refetch()}
                >
                    <Refresh fontSize="inherit" />
                </Button> */}
                <Table
                    rowIdentifier="id"
                    alternatingColumnColors={USE_ALTERNATING_COLUMN_COLORS}
                    columns={TABLE_COLUMNS}
                    rows={tableRows}
                    numPendingRows={sessionsQuery.isLoading || sessionsQuery.isFetchingNextPage ? QUERY_PAGE_SIZE : 0}
                    rowHeight={ROW_HEIGHT}
                    height={ROW_HEIGHT * QUERY_PAGE_SIZE}
                    headerHeight={50}
                    sorting={tableSortState}
                    onSortingChange={setTableSortState}
                    selectable
                    controlledCollation
                    onSelectedRowsChange={(selection) => setSelectedSessionId(selection[0])}
                    onVisibleRowRangeChange={onTableScrollIndexChange}
                />
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
