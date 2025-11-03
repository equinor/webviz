import React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import type { Options } from "@hey-api/client-axios";
import { Close, Delete, FileOpen, Search } from "@mui/icons-material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash";
import { toast } from "react-toastify";

import type { GetSnapshotAccessLogsData_api, GraphUser_api, SnapshotAccessLog_api, SortDirection_api } from "@api";
import { getSnapshotAccessLogsInfiniteOptions, getUserInfoOptions, SnapshotAccessLogSortBy_api } from "@api";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Table } from "@lib/components/Table";
import type { TableColumns, TableSorting, TContext } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
import { Tooltip } from "@lib/components/Tooltip";
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

const makeRowStyle = (context: TContext<FlattenedSnapshotAccessLog_api>): React.CSSProperties => {
    if (context.entry.snapshotDeleted) {
        return {
            textDecoration: "line-through",
            opacity: 0.6,
        };
    }
    return {};
};

const TABLE_COLUMNS: TableColumns<FlattenedSnapshotAccessLog_api> = [
    {
        _type: "data",
        label: "Visits",
        sizeInPercent: 7,
        columnId: "visits",
        sortable: false, // The sorting adornments require too much space, so the table looks off
        filter: false,
        formatStyle: (v, context) => ({ textAlign: "center", paddingRight: "0.5rem", ...makeRowStyle(context) }),
    },
    {
        _type: "data",
        label: "Title",
        sizeInPercent: 24,
        columnId: "snapshotMetadata.title",
        filter: false,
        renderData(value, context) {
            const style = makeRowStyle(context);
            return (
                <span style={{ ...style, textDecoration: "inherit" }}>
                    {value}
                    {context.entry.snapshotDeleted && <strong className="text-red-600"> (deleted by owner)</strong>}
                </span>
            );
        },
    },
    {
        _type: "data",
        columnId: "snapshotMetadata.description",
        label: "Description",
        sizeInPercent: 26,
        filter: false,
        sortable: false,
        formatStyle: (value, context) => {
            let style = makeRowStyle(context);
            if (!value) {
                style = {
                    ...style,
                    color: "gray",
                    fontStyle: "italic",
                };
            }
            return style;
        },
    },
    {
        // TODO: This too could be a "virtual" column
        _type: "data",
        columnId: "snapshotId",
        label: "Url",
        sortable: false,
        filter: false,
        sizeInPercent: 12,
        renderData(snapshotId, context) {
            const style = makeRowStyle(context);
            const url = buildSnapshotUrl(snapshotId);
            return (
                <a
                    className="px-1 inline-block font-mono bg-gray-100 rounded border text-blue-700 border-gray-200"
                    href={url}
                    style={style}
                    onClick={(evt) => {
                        evt.preventDefault();
                        navigator.clipboard.writeText(url);
                        toast.info("Url copied");
                    }}
                >{`/${snapshotId}`}</a>
            );
        },
    },
    {
        _type: "data",
        columnId: "snapshotMetadata.ownerId",
        label: "Owner",
        sortable: false,
        filter: false,
        sizeInPercent: 11,
        renderData: function OwnerField(userId: string, context) {
            const style = makeRowStyle(context);
            const ownerInfo = useUserGraphInfo(userId);
            const name = ownerInfo?.principal_name?.split("@")?.[0].toLocaleLowerCase();
            return (
                <div className="flex gap-1" style={style}>
                    <UserAvatar userIdOrEmail={userId} userDisplayName={ownerInfo?.display_name} />
                    {name}
                </div>
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
            if (!value) return "N/A";
            return formatDate(new Date(value));
        },
        formatStyle: (value, context) => {
            const style = makeRowStyle(context);
            if (!value) {
                return {
                    ...style,
                    color: "gray",
                    fontStyle: "italic",
                };
            }
            return style;
        },
    },
];

function useUserGraphInfo(ownerId: string | undefined): GraphUser_api | null {
    const userInfoQuery = useQuery({
        ...getUserInfoOptions({ path: { user_id_or_email: ownerId ?? "" } }),
        enabled: Boolean(ownerId),
    });

    return userInfoQuery.data ?? null;
}

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

export function flattenSnapshotAccessLogEntry(logEntry: SnapshotAccessLog_api): FlattenedSnapshotAccessLog_api {
    const ret = omit(logEntry, ["snapshotMetadata"]) as Record<string, any>;

    Object.entries(logEntry.snapshotMetadata).forEach(([k, v]) => {
        const flattenedKey = `snapshotMetadata.${k}`;
        ret[flattenedKey] = v;
    });

    return ret as FlattenedSnapshotAccessLog_api;
}

export type SnapshotOverviewContentProps = {
    workbench: Workbench;
};

export function SnapshotManagementContent(props: SnapshotOverviewContentProps): React.ReactNode {
    const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableFilter, setTableFilter] = React.useState<TableFilter>({});
    const [tableSortState, setTableSortState] = React.useState<TableSorting>([
        { columnId: "lastVisitedAt", direction: TableSortDirection.DESC },
    ]);

    const querySortParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
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

    const snapshotsQuery = useInfiniteQuery({
        ...getSnapshotAccessLogsInfiniteOptions({
            query: { ...querySortParams, page_size: QUERY_PAGE_SIZE },
        }),
        // Tanstack requires initialPageParam. The correct option would be `null`, but that causes an
        // undefined-error in `getVisitedSnapshotsInfiniteOptions(...)` since it thinks it's an object.
        initialPageParam: "",
        refetchInterval: 10000,
        getNextPageParam(lastPage) {
            return lastPage.pageToken;
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

    async function handleDeleteClick() {
        if (!selectedSnapshotId) return;

        setDeletePending(true);

        const success = await props.workbench.deleteSnapshot(selectedSnapshotId);
        setDeletePending(false);

        if (!success) {
            return;
        }

        setSelectedSnapshotId(null);
    }

    function handleOpenSnapshotClick() {
        if (!selectedSnapshotId) return;

        props.workbench.openSnapshot(selectedSnapshotId);
    }

    const tableData = React.useMemo(() => {
        if (!snapshotsQuery.data) return [];

        return snapshotsQuery.data?.pages?.flatMap(({ items }) => {
            return items.map(flattenSnapshotAccessLogEntry);
        });
    }, [snapshotsQuery.data]);

    const onTableScrollIndexChange = React.useCallback((start: number, end: number) => {
        setVisibleRowRange({ start, end });
    }, []);

    const selectedSnapshot = React.useMemo(() => {
        if (!selectedSnapshotId) return null;
        return tableData.find((snapshot) => snapshot.snapshotId === selectedSnapshotId) || null;
    }, [tableData, selectedSnapshotId]);

    React.useEffect(
        function maybeRefetchNextPageEffect() {
            if (!visibleRowRange || visibleRowRange.end === -1) return;
            if (!snapshotsQuery.hasNextPage) return;
            if (snapshotsQuery.isFetchingNextPage) return;
            if (tableData.length - visibleRowRange?.end <= NEXT_PAGE_THRESHOLD) {
                snapshotsQuery.fetchNextPage();
            }
        },
        [snapshotsQuery, tableData.length, visibleRowRange],
    );

    const isSnapshotDeleted = selectedSnapshot?.snapshotDeleted ?? false;

    return (
        <>
            <div className="mb-4 flex gap-4">
                <Label text="Title" wrapperClassName="grow">
                    <Input
                        startAdornment={<Search fontSize="small" />}
                        endAdornment={
                            <DenseIconButton onClick={() => handleTitleFilterValueChange("")} title="Clear filter">
                                <Close fontSize="inherit" />
                            </DenseIconButton>
                        }
                        value={tableFilter.title ?? ""}
                        placeholder="Search title"
                        onValueChange={handleTitleFilterValueChange}
                        className="h-6"
                    />
                </Label>

                {/* TODO: Allow the user to filter on owner. Awaiting fixed picker comp, which I think is being done on the ensemble dialog */}
                {/* <Label text="Last visited at" wrapperClassName="">
                </Label> */}

                <Label text="Last visited at" wrapperClassName="min-w-2xs">
                    <DateRangePicker
                        onChange={onFilterRangeChange}
                        className="webviz-eds-date-range-picker --compact rounded focus-within:outline-0 border border-gray-300 h-10"
                    />
                </Label>
            </div>
            <div className="flex gap-2 mb-2 justify-end">
                <Tooltip
                    title={isSnapshotDeleted ? "Selected snapshot has been deleted" : "Open selected snapshot"}
                    placement="top"
                    enterDelay="medium"
                >
                    <Button
                        color="primary"
                        disabled={!selectedSnapshotId || selectedSnapshot?.snapshotDeleted}
                        onClick={handleOpenSnapshotClick}
                        size="medium"
                    >
                        <FileOpen fontSize="inherit" /> Open
                    </Button>
                </Tooltip>
                <Tooltip
                    title={isSnapshotDeleted ? "Selected snapshot has been deleted" : "Delete selected snapshot"}
                    placement="top"
                    enterDelay="medium"
                >
                    <Button
                        color="danger"
                        disabled={!selectedSnapshotId || deletePending || selectedSnapshot?.snapshotDeleted}
                        onClick={handleDeleteClick}
                        size="medium"
                    >
                        {deletePending ? <CircularProgress size="small" /> : <Delete fontSize="inherit" />} Delete
                    </Button>
                </Tooltip>
            </div>
            <Table
                rowIdentifier="snapshotId"
                alternatingColumnColors={USE_ALTERNATING_COLUMN_COLORS}
                columns={TABLE_COLUMNS}
                rows={tableData}
                numPendingRows={snapshotsQuery.isLoading || snapshotsQuery.isFetchingNextPage ? QUERY_PAGE_SIZE : 0}
                rowHeight={ROW_HEIGHT}
                height={TABLE_HEIGHT}
                headerHeight={HEADER_HEIGHT}
                sorting={tableSortState}
                onSortingChange={setTableSortState}
                selectable
                controlledCollation
                onVisibleRowRangeChange={onTableScrollIndexChange}
                onSelectedRowsChange={(selection) => setSelectedSnapshotId(selection[0])}
            />
        </>
    );
}
