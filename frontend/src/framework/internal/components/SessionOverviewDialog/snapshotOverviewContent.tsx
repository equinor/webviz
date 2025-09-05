import React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import type { Options } from "@hey-api/client-axios";
import { useInfiniteQuery } from "@tanstack/react-query";

import type { GetRecentSnapshotsData_api, SnapshotAccessLog_api, SortDirection_api } from "@api";
import { SnapshotAccessLogSortBy_api, getRecentSnapshotsInfiniteOptions } from "@api";
import type { Workbench } from "@framework/Workbench";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Table } from "@lib/components/Table";
import type { TableColumns, TableSorting } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
import { formatDate } from "@lib/utils/dates";

import { UserAvatar } from "../UserAvatar";

import { edsRangeChoiceToFilterRange, type EdsFilterRange, type FilterRange } from "./_utils";
import {
    HEADER_HEIGHT,
    NEXT_PAGE_THRESHOLD,
    QUERY_PAGE_SIZE,
    ROW_HEIGHT,
    TABLE_HEIGHT,
    USE_ALTERNATING_COLUMN_COLORS,
} from "./constants";

// The table comp doesn't support nested object key paths, so we transform the data into a flattened object
type FlattenedSnapshotAccessLog_api = Omit<SnapshotAccessLog_api, "snapshotMetadata"> & {
    [K in keyof SnapshotAccessLog_api["snapshotMetadata"] as `snapshotMetadata.${Extract<K, string>}`]: SnapshotAccessLog_api["snapshotMetadata"][K];
};

type TableFilter = {
    title?: string;
    visitedAt?: FilterRange;
};

const TABLE_COLUMNS: TableColumns<FlattenedSnapshotAccessLog_api> = [
    {
        _type: "data",
        label: "Visits",
        sizeInPercent: 7,
        columnId: "visits",
        sortable: false, // The sorting adornments require too much space, so the table looks off
        filter: false,
        formatStyle: () => ({ textAlign: "center", paddingRight: "0.5rem" }),
    },
    {
        _type: "data",
        label: "Title",
        sizeInPercent: 24,
        columnId: "snapshotMetadata.title",
        filter: false,
    },
    {
        _type: "data",
        columnId: "snapshotMetadata.description",
        label: "Description",
        sizeInPercent: 34,
        filter: false,
        sortable: false,
        renderData(value) {
            return value || <span className="text-gray-400 italic">N/A</span>;
        },
    },
    {
        _type: "data",
        columnId: "snapshotMetadata.ownerId",
        label: "Owner",
        sortable: false,
        filter: false,
        sizeInPercent: 15,
        renderData() {
            // TODO: Need new backend oid
            return (
                <>
                    <div className="flex gap-1">
                        <UserAvatar userEmail="anhun@equinor.com" />
                        anhun
                    </div>
                </>
            );
        },
    },

    {
        _type: "data",
        label: "Last visited at",
        sizeInPercent: 20,
        columnId: "lastVisitedAt",
        filter: false,
        renderData(value) {
            if (!value) return <span className="text-gray-400 italic">N/A</span>;
            return formatDate(new Date(value));
        },
    },
];

function columnIdToApiSortField(columnId: string): SnapshotAccessLogSortBy_api {
    switch (columnId as keyof FlattenedSnapshotAccessLog_api) {
        case "visits":
            return SnapshotAccessLogSortBy_api.VISITS;
        case "snapshotMetadata.title":
            return SnapshotAccessLogSortBy_api.SNAPSHOT_METADATA_TITLE;
        case "lastVisitedAt":
            return SnapshotAccessLogSortBy_api.LAST_VISITED_AT;
        case "snapshotMetadata.createdAt":
            return SnapshotAccessLogSortBy_api.SNAPSHOT_METADATA_CREATED_AT;

        default:
            throw new Error(`Unknown columnId: ${columnId}`);
    }
}

function tableSortDirToApiSortDir(sort: TableSortDirection): SortDirection_api {
    return sort as unknown as SortDirection_api;
}

export type SnapshotOverviewContentProps = {
    selectedSession: string | null;
    workbench: Workbench;
    editOpen: boolean;
    onSelectSession: (sessionId: string | null) => void;
    onEditClose: () => void;
};

export function SnapshotOverviewContent(props: SnapshotOverviewContentProps): React.ReactNode {
    // ? Should this be opened via gui-events?

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableFilter, setTableFilter] = React.useState<TableFilter>({});
    const [tableSortState, setTableSortState] = React.useState<TableSorting>([
        { columnId: "lastVisitedAt", direction: TableSortDirection.DESC },
    ]);

    const querySortParams = React.useMemo<Options<GetRecentSnapshotsData_api>["query"]>(() => {
        if (!tableSortState?.length) return undefined;

        const sortBy = columnIdToApiSortField(tableSortState[0].columnId);
        const SortDirection = tableSortDirToApiSortDir(tableSortState[0].direction);

        return {
            sort_by: sortBy,
            sort_direction: SortDirection,
            filter_title: tableFilter.title,
            filter_updated_from: tableFilter.visitedAt?.from,
            filter_updated_to: tableFilter.visitedAt?.to,
        };
    }, [tableFilter, tableSortState]);

    // const sessionsQuery = useInfiniteSessionMetadataQuery(querySortParams);
    const sessionsQuery = useInfiniteQuery({
        ...getRecentSnapshotsInfiniteOptions({
            query: { ...querySortParams, limit: QUERY_PAGE_SIZE },
        }),
        initialPageParam: 0,
        refetchInterval: 10000,
        // TODO: Currently uses standard SQL pagination. Move over to continuation-tokens for better RU usage
        getNextPageParam(lastPage, pages) {
            if (lastPage.length < QUERY_PAGE_SIZE) return null;
            return pages.length;
        },
    });

    function onFilterRangeChange(newRange: null | EdsFilterRange) {
        setTableFilter((prev) => {
            return {
                ...prev,
                visitedAt: edsRangeChoiceToFilterRange(newRange),
            };
        });
    }

    function handleTitleFilterValueChange(newValue: string) {
        setTableFilter((prev) => {
            return {
                ...prev,
                title: newValue || undefined,
            };
        });
    }

    const tableData = React.useMemo(() => {
        if (!sessionsQuery.data) return [];
        return sessionsQuery.data?.pages?.flat().map((v) => {
            const ret = { ...v } as Record<string, any>;

            Object.entries(v.snapshotMetadata).forEach(([k, v]) => {
                ret[`snapshotMetadata.${k}`] = v;
            });

            delete ret.snapshotMetadata;

            return ret as FlattenedSnapshotAccessLog_api;
        });
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

    return (
        <>
            <div className="mb-8 flex gap-4">
                <Label text="Title" wrapperClassName="grow">
                    <Input
                        value={tableFilter.title ?? ""}
                        placeholder="Search title"
                        onValueChange={handleTitleFilterValueChange}
                    />
                </Label>

                {/* TODO: Allow the user to filter on owner. Awaiting fixed picker comp, which I think is being done on the ensemble dialog */}
                {/* <Label text="Last visited at" wrapperClassName="">
                </Label> */}

                <Label text="Last visited at" wrapperClassName="min-w-2xs">
                    <DateRangePicker onChange={onFilterRangeChange} />
                </Label>
            </div>

            <Table
                rowIdentifier="snapshotId"
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
        </>
    );
}
