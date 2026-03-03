import React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import { Add, Close, Delete, Edit, FileOpen, Refresh, Search } from "@mui/icons-material";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import type {
    GetSessionsMetadataData_api,
    GetSessionsMetadataError_api,
    GetSessionsMetadataResponse_api,
    Options,
    SessionMetadata_api,
    SortDirection_api,
} from "@api";
import { getSessionsMetadata, SessionSortBy_api } from "@api";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import {
    edsDateRangeToIsoStringRange,
    isoRangeToEdsDateRange,
    type EdsDateRange,
    type IsoStringRange,
} from "@framework/utils/edsDateUtils";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Table } from "@lib/components/Table";
import type { TableColumns, TableSorting } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
import { Tooltip } from "@lib/components/Tooltip";
import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { formatDate } from "@lib/utils/dates";

import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";

import {
    QUERY_PAGE_SIZE,
    NEXT_PAGE_THRESHOLD,
    USE_ALTERNATING_COLUMN_COLORS,
    ROW_HEIGHT,
    TABLE_HEIGHT,
    HEADER_HEIGHT,
} from "./constants";

type TableFilter = {
    title?: string;
    updatedAt?: IsoStringRange;
};

const TABLE_COLUMNS: TableColumns<SessionMetadata_api> = [
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
        renderData(value) {
            return value || <span className="text-current/50 italic">N/A</span>;
        },
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
            return SessionSortBy_api.METADATA_TITLE;
        case "updatedAt":
            return SessionSortBy_api.METADATA_UPDATED_AT;
        case "createdAt":
            return SessionSortBy_api.METADATA_CREATED_AT;

        default:
            throw new Error(`Unknown columnId: ${columnId}`);
    }
}

function tableSortDirToApiSortDir(sort: TableSortDirection): SortDirection_api {
    return sort as unknown as SortDirection_api;
}

function useInfiniteSessionMetadataQuery(
    querySortParams: Options<GetSessionsMetadataData_api>["query"],
    enabled?: boolean,
) {
    // ! We need to manually write out the query because hey-api generates keys in a way that messes with Tanstack's
    // ! ability to set query data (which we use after mutating metadata).
    // ! You'd think this would work, but if I try this; the data never loads, because it tries to get the query
    // ! params from the key...
    // return useInfiniteQuery({
    //     ...getSessionsMetadataInfiniteOptions({
    //         query: {
    //             ...querySortParams,
    //             limit: QUERY_PAGE_SIZE,
    //             // // TODO: Rename `cursor` to `continuation_token` once we update to latest hey-api version
    //             // cursor: pageParam,
    //         },
    //     }),
    //     queryKey: [
    //         // @ts-expect-error -- Ignore expected tanstack key type
    //         "getSessionsMetadata",
    //         "infinite",
    //         querySortParams?.filter_title,
    //         querySortParams?.filter_updated_from,
    //         querySortParams?.filter_updated_to,
    //         querySortParams?.sort_by,
    //         querySortParams?.sort_direction,
    //     ],
    //     initialPageParam: null,
    //     refetchInterval: 20000,
    //     getNextPageParam(lastPage) {
    //         return lastPage.continuation_token;
    //     },
    // });

    return useInfiniteQuery<
        GetSessionsMetadataResponse_api,
        AxiosError<GetSessionsMetadataError_api>,
        InfiniteData<GetSessionsMetadataResponse_api>,
        readonly unknown[],
        string | null
    >({
        queryKey: [
            "getSessionsMetadata",
            "infinite",
            querySortParams?.filter_title,
            querySortParams?.filter_updated_from,
            querySortParams?.filter_updated_to,
            querySortParams?.sort_by,
            querySortParams?.sort_direction,
        ],
        initialPageParam: null,
        refetchInterval: 20000,
        getNextPageParam(lastPage) {
            return lastPage.pageToken;
        },
        async queryFn({ pageParam, signal }) {
            const { data } = await getSessionsMetadata({
                signal,
                throwOnError: true,
                query: {
                    ...querySortParams,
                    page_size: QUERY_PAGE_SIZE,
                    // TODO: Rename `cursor` to `continuation_token` once we update to latest hey-api version
                    cursor: pageParam,
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network latency for better UX when testing

            return data;
        },
        enabled,
    });
}

export type SessionOverviewContentProps = {
    workbench: Workbench;
    active: boolean;
};

export function SessionManagementContent(props: SessionOverviewContentProps): React.ReactNode {
    const [editSessionDialogOpen, setEditSessionDialogOpen] = React.useState<boolean>(false);
    const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableFilter, setTableFilter] = React.useState<TableFilter>({});
    const [tableSortState, setTableSortState] = React.useState<TableSorting>([
        { columnId: "updatedAt", direction: TableSortDirection.DESC },
    ]);
    const [titleInputValue, setTitleInputValue] = React.useState<string>("");

    const timeoutFunction = useTimeoutFunction();

    const querySortParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        if (!tableSortState?.length) return undefined;

        const sortBy = columnIdToApiSortField(tableSortState[0].columnId);
        const SortDirection = tableSortDirToApiSortDir(tableSortState[0].direction);

        return {
            sort_by: sortBy,
            sort_direction: SortDirection,
            filter_title: tableFilter.title,
            filter_updated_from: tableFilter.updatedAt?.from,
            filter_updated_to: tableFilter.updatedAt?.to,
        };
    }, [tableFilter, tableSortState]);

    const sessionsQuery = useInfiniteSessionMetadataQuery(querySortParams, props.active);

    const { isRefreshing, refresh } = useRefreshQuery(sessionsQuery);

    const tableData = React.useMemo(() => {
        if (!sessionsQuery.data) return [];

        return sessionsQuery.data.pages?.flatMap(({ items }) => items);
    }, [sessionsQuery.data]);

    const onTableScrollIndexChange = React.useCallback((start: number, end: number) => {
        setVisibleRowRange({ start, end });
    }, []);

    const selectedSession = React.useMemo(() => {
        if (!selectedSessionId) return null;
        return tableData.find((session) => session.id === selectedSessionId) || null;
    }, [tableData, selectedSessionId]);

    React.useEffect(
        function maybeRefetchNextPageEffect() {
            if (!visibleRowRange || visibleRowRange.end === -1) return;
            if (!sessionsQuery.hasNextPage) return;
            if (sessionsQuery.isFetchingNextPage) return;
            if (tableData.length - visibleRowRange?.end <= NEXT_PAGE_THRESHOLD) {
                sessionsQuery.fetchNextPage();
            }
        },
        [sessionsQuery, tableData.length, visibleRowRange],
    );

    function handleDateFilterRangeChange(newRange: null | EdsDateRange) {
        setTableFilter((prev) => {
            return {
                ...prev,
                updatedAt: edsDateRangeToIsoStringRange(newRange) ?? undefined,
            };
        });
    }

    function handleTitleFilterValueChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newValue = e.target.value;
        setTitleInputValue(newValue);

        timeoutFunction(() => {
            setTableFilter((prev) => {
                return {
                    ...prev,
                    title: newValue || undefined,
                };
            });
        }, 800);
    }

    function handleClearTitleFilter() {
        setTitleInputValue("");
        setTableFilter((prev) => {
            return {
                ...prev,
                title: undefined,
            };
        });
    }

    async function handleDeleteClick() {
        if (!selectedSessionId) return;

        setDeletePending(true);

        const success = await props.workbench.getSessionManager().deleteSession(selectedSessionId);
        setDeletePending(false);

        if (!success) {
            return;
        }

        setSelectedSessionId(null);
    }

    function handleEditClick() {
        if (!selectedSessionId) return;

        setEditSessionDialogOpen(true);
    }

    async function handleOpenSessionClick() {
        if (!selectedSessionId) return;

        await props.workbench.getSessionManager().openSession(selectedSessionId);
    }

    function handleNewSessionClick() {
        props.workbench.getSessionManager().startNewSession();
    }

    return (
        <>
            <div className="mb-4 flex gap-4">
                <Label text="Title" wrapperClassName="grow">
                    <Input
                        startAdornment={<Search fontSize="small" />}
                        endAdornment={
                            <DenseIconButton onClick={handleClearTitleFilter} title="Clear filter">
                                <Close fontSize="inherit" />
                            </DenseIconButton>
                        }
                        value={titleInputValue}
                        placeholder="Search title"
                        onChange={handleTitleFilterValueChange}
                        className="h-6"
                    />
                </Label>
                <Label text="Updated at" wrapperClassName="min-w-2xs">
                    <DateRangePicker
                        className="webviz-eds-date-range-picker --compact rounded focus-within:outline-0 border border-gray-300"
                        value={isoRangeToEdsDateRange(tableFilter.updatedAt ?? null)}
                        onChange={handleDateFilterRangeChange}
                    />
                </Label>
            </div>
            <div className="flex gap-2 mb-2">
                <Tooltip title="Start and open new session" placement="bottom" enterDelay="medium">
                    <Button color="primary" onClick={handleNewSessionClick} variant="contained" size="medium">
                        <Add fontSize="inherit" /> New session
                    </Button>
                </Tooltip>
                <span className="grow" />
                <Tooltip title="Edit the selected session" placement="bottom" enterDelay="medium">
                    <Button color="primary" disabled={!selectedSessionId} onClick={handleEditClick} size="medium">
                        <Edit fontSize="inherit" /> Edit
                    </Button>
                </Tooltip>
                <Tooltip title="Open the selected session" placement="bottom" enterDelay="medium">
                    <Button
                        color="primary"
                        disabled={!selectedSessionId}
                        onClick={handleOpenSessionClick}
                        size="medium"
                    >
                        <FileOpen fontSize="inherit" /> Open
                    </Button>
                </Tooltip>
                <Tooltip title="Delete the selected session" placement="bottom" enterDelay="medium">
                    <Button
                        color="danger"
                        disabled={!selectedSessionId || deletePending}
                        onClick={handleDeleteClick}
                        size="medium"
                    >
                        {deletePending ? <CircularProgress size="small" /> : <Delete fontSize="inherit" />} Delete
                    </Button>
                </Tooltip>
                <Tooltip title="Refresh list" placement="top" enterDelay="medium">
                    <Button color="primary" onClick={refresh} size="medium">
                        {isRefreshing ? <CircularProgress size="small" /> : <Refresh fontSize="inherit" />} Refresh
                    </Button>
                </Tooltip>
            </div>
            <Table
                rowIdentifier="id"
                alternatingColumnColors={USE_ALTERNATING_COLUMN_COLORS}
                columns={TABLE_COLUMNS}
                rows={tableData}
                numPendingRows={sessionsQuery.isLoading || sessionsQuery.isFetchingNextPage ? QUERY_PAGE_SIZE : 0}
                rowHeight={ROW_HEIGHT}
                height={TABLE_HEIGHT}
                headerHeight={HEADER_HEIGHT}
                sorting={tableSortState}
                onSortingChange={setTableSortState}
                selectedRows={selectedSessionId ? [selectedSessionId] : []}
                selectable
                controlledCollation
                onSelectedRowsChange={(selection) => setSelectedSessionId(selection[0])}
                onVisibleRowRangeChange={onTableScrollIndexChange}
                noDataMessage="No sessions found."
            />
            <EditSessionMetadataDialog
                workbench={props.workbench}
                id={selectedSessionId}
                open={editSessionDialogOpen}
                title={selectedSession?.title || ""}
                description={selectedSession?.description || ""}
                onClose={() => setEditSessionDialogOpen(false)}
            />
        </>
    );
}
