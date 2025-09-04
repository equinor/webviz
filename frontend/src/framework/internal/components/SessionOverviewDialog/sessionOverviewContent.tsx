import React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import type { Options } from "@hey-api/client-axios";
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
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Table } from "@lib/components/Table";
import type { TableColumns, TableSorting } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
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
    [SessionSortBy_api.METADATA_TITLE_LOWER]?: string;
    [SessionSortBy_api.METADATA_UPDATED_AT]?: { from?: string; to?: string };
};

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
            return SessionSortBy_api.METADATA_TITLE_LOWER;
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
function useInfiniteSessionMetadataQuery(querySortParams: Options<GetSessionsMetadataData_api>["query"]) {
    return useInfiniteQuery<
        SessionMetadataWithId_api[],
        AxiosError<GetSessionsMetadataError_api>,
        InfiniteData<SessionMetadataWithId_api[]>,
        readonly unknown[],
        number
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
        initialPageParam: 0,
        refetchInterval: 20000,
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

export type SessionOverviewContentProps = {
    selectedSession: string | null;
    workbench: Workbench;
    editOpen: boolean;
    onSelectSession: (sessionId: string | null) => void;
    onEditClose: () => void;
};

export function SessionOverviewContent(props: SessionOverviewContentProps): React.ReactNode {
    // ? Should this be opened via gui-events?

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableFilter, setTableFilter] = React.useState<TableFilter>({});
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
            filter_title: tableFilter[SessionSortBy_api.METADATA_TITLE_LOWER]?.toLowerCase(),
            filter_updated_from: tableFilter[SessionSortBy_api.METADATA_UPDATED_AT]?.from,
            filter_updated_to: tableFilter[SessionSortBy_api.METADATA_UPDATED_AT]?.to,
        };
    }, [tableFilter, tableSortState]);

    const sessionsQuery = useInfiniteSessionMetadataQuery(querySortParams);

    const tableData = React.useMemo(() => {
        if (!sessionsQuery.data) return [];

        // The backend wont ever return a null in this list, but the entry might be replaced locally during a
        // delete-mutation side-effect, where we set it to null to maintain a consistent page-size
        return sessionsQuery.data?.pages?.flat().filter((entry) => entry != null);
    }, [sessionsQuery.data]);

    const onTableScrollIndexChange = React.useCallback((start: number, end: number) => {
        setVisibleRowRange({ start, end });
    }, []);

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

    const selectedSession = React.useMemo(() => {
        if (!props.selectedSession) return null;
        return tableData.find((session) => session.id === props.selectedSession) || null;
    }, [tableData, props.selectedSession]);

    function onFilterRangeChange(newRange: null | { from: Date | null; to: Date | null }) {
        // TODO

        setTableFilter((prev) => {
            const newFilter = { ...prev };

            if (newRange?.from || newRange?.to) {
                newFilter[SessionSortBy_api.METADATA_UPDATED_AT] = {};
                const rangeFilter = newFilter[SessionSortBy_api.METADATA_UPDATED_AT];

                if (newRange.from) rangeFilter.from = newRange.from.toISOString();
                if (newRange.to) {
                    // The range component always uses hour 0 for the time
                    // We set the time to 23:59:59 to range inclusive
                    const toDate = new Date(newRange.to);
                    toDate.setHours(23, 59, 59);
                    rangeFilter.to = toDate.toISOString();
                }
            } else {
                delete newFilter[SessionSortBy_api.METADATA_UPDATED_AT];
            }


            return newFilter;
        });
    }

    function handleTitleFilterValueChange(newValue: string) {
        setTableFilter((prev) => {
            const newFilter = { ...prev };

            if (newValue) newFilter[SessionSortBy_api.METADATA_TITLE_LOWER] = newValue;
            else newFilter[SessionSortBy_api.METADATA_TITLE_LOWER] = undefined;

            return newFilter;
        });
    }

    return (
        <>
            <div className="mb-8 flex gap-4">
                <Label text="Title" wrapperClassName="grow">
                    <Input
                        value={tableFilter[SessionSortBy_api.METADATA_TITLE_LOWER] ?? ""}
                        placeholder="Search title"
                        onValueChange={handleTitleFilterValueChange}
                    />
                </Label>

                <Label text="Updated at" wrapperClassName="min-w-2xs">
                    <DateRangePicker onChange={onFilterRangeChange} />
                </Label>
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
                selectable
                controlledCollation
                onSelectedRowsChange={(selection) => props.onSelectSession(selection[0])}
                onVisibleRowRangeChange={onTableScrollIndexChange}
            />

            {selectedSession && (
                <EditSessionMetadataDialog
                    workbench={props.workbench}
                    sessionId={selectedSession.id}
                    sessionMetadata={selectedSession}
                    open={props.editOpen}
                    onClose={props.onEditClose}
                />
            )}
        </>
    );
}
