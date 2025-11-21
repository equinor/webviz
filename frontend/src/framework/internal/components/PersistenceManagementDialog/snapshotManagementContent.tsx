import React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import type { Options } from "@hey-api/client-axios";
import { Close, Delete, FileOpen, Refresh, Search } from "@mui/icons-material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash";

import type { GetSnapshotAccessLogsData_api, GraphUser_api, SnapshotAccessLog_api, SortDirection_api } from "@api";
import { getSnapshotAccessLogsInfiniteOptions, getUserInfoOptions, SnapshotAccessLogSortBy_api } from "@api";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import { Table } from "@lib/components/Table";
import { CopyCellValue } from "@lib/components/Table/column-components/CopyCellValue";
import type { TableColumns, TableSorting, TContext } from "@lib/components/Table/types";
import { SortDirection as TableSortDirection } from "@lib/components/Table/types";
import { Tooltip } from "@lib/components/Tooltip";
import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
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
    ownerId?: string;
    snapshotDeleted?: boolean;
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
        label: "URL",
        sortable: false,
        filter: false,
        sizeInPercent: 12,
        renderData: function SnapshotUrlCell(snapshotId, context) {
            const url = buildSnapshotUrl(snapshotId);

            function handleCopyRequested() {
                return url;
            }

            const style = makeRowStyle(context);

            return (
                <CopyCellValue onCopyRequested={handleCopyRequested}>
                    <div className="h-full group relative flex items-center min-w-0" style={style} title={url}>
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</div>
                    </div>
                </CopyCellValue>
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
    active: boolean;
};

export function SnapshotManagementContent(props: SnapshotOverviewContentProps): React.ReactNode {
    const userId = useAuthProvider().userInfo?.user_id;
    const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableFilter, setTableFilter] = React.useState<TableFilter>({});
    const [tableSortState, setTableSortState] = React.useState<TableSorting>([
        { columnId: "lastVisitedAt", direction: TableSortDirection.DESC },
    ]);

    const timeoutFunction = useTimeoutFunction();

    const querySortParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
        if (!tableSortState?.length) return undefined;

        const sortBy = columnIdToApiSortField(tableSortState[0].columnId);
        const SortDirection = tableSortDirToApiSortDir(tableSortState[0].direction);

        return {
            sort_by: sortBy,
            sort_direction: SortDirection,
            filter_title: tableFilter.title,
            filter_last_visited_from: tableFilter.visitedAt?.from,
            filter_last_visited_to: tableFilter.visitedAt?.to,
            filter_owner_id: tableFilter.ownerId,
            filter_snapshot_deleted: tableFilter.snapshotDeleted,
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
        enabled: props.active,
    });

    const { isRefreshing, refresh } = useRefreshQuery(snapshotsQuery);

    const tableData = React.useMemo(() => {
        if (!snapshotsQuery.data) return [];

        return snapshotsQuery.data?.pages?.flatMap(({ items }) => {
            return items.map(flattenSnapshotAccessLogEntry);
        });
    }, [snapshotsQuery.data]);

    const selectedSnapshot = React.useMemo(() => {
        if (!selectedSnapshotId) return null;
        return tableData.find((snapshot) => snapshot.snapshotId === selectedSnapshotId) || null;
    }, [tableData, selectedSnapshotId]);

    function handleFilterRangeChange(newRange: null | EdsFilterRange) {
        setTableFilter((prev) => {
            return {
                ...prev,
                visitedAt: edsRangeChoiceToFilterRange(newRange),
            };
        });
    }

    function handleTitleFilterValueChange(e: React.ChangeEvent<HTMLInputElement>) {
        timeoutFunction(() => {
            const newValue = e.target.value;
            setTableFilter((prev) => {
                return {
                    ...prev,
                    title: newValue ?? undefined,
                };
            });
        }, 800);
    }

    function handleClearTitleFilter() {
        setTableFilter((prev) => {
            return {
                ...prev,
                title: undefined,
            };
        });
    }

    function handleShowMySnapshotsOnlyChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;

        if (!userId) return;
        setTableFilter((prev) => {
            return {
                ...prev,
                ownerId: checked ? userId : undefined,
            };
        });
    }

    function handleHideDeletedSnapshotsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;

        setTableFilter((prev) => {
            return {
                ...prev,
                snapshotDeleted: checked ? false : undefined,
            };
        });
    }

    async function handleDeleteClick() {
        if (!selectedSnapshot || !userId) return;

        const snapshotOwnerId = selectedSnapshot["snapshotMetadata.ownerId"];

        setDeletePending(true);

        let success: boolean;
        if (userId === snapshotOwnerId) {
            success = await props.workbench.getSessionManager().deleteSnapshot(selectedSnapshotId!);
        } else {
            success = await props.workbench.getSessionManager().deleteSnapshotAccessLog(selectedSnapshotId!);
        }

        setDeletePending(false);

        if (!success) {
            return;
        }

        setSelectedSnapshotId(null);
    }

    async function handleOpenSnapshotClick() {
        if (!selectedSnapshotId) return;

        await props.workbench.getSessionManager().openSnapshot(selectedSnapshotId);
    }

    const handleTableScrollIndexChange = React.useCallback(function handleTableScrollIndexChange(
        start: number,
        end: number,
    ) {
        setVisibleRowRange({ start, end });
    }, []);

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

    let deleteButtonText = "Delete";
    let deleteButtonTooltip = "";
    if (selectedSnapshotId) {
        const isOwner = selectedSnapshot?.["snapshotMetadata.ownerId"] === userId;
        deleteButtonText = isOwner ? "Delete snapshot" : "Remove from list";
        deleteButtonTooltip = isOwner
            ? "Delete selected snapshot (permanently removes it for all users)"
            : "Remove snapshot from list (you are not the owner, snapshot will remain accessible to other users)";
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
                        value={tableFilter.title ?? ""}
                        placeholder="Search title"
                        onChange={handleTitleFilterValueChange}
                        className="h-6"
                    />
                </Label>
                <Label text="Last visited at" wrapperClassName="min-w-2xs">
                    <DateRangePicker
                        onChange={handleFilterRangeChange}
                        className="webviz-eds-date-range-picker --compact rounded focus-within:outline-0 border border-gray-300 h-10"
                    />
                </Label>
            </div>
            <div className="flex gap-4 mb-2 items-center">
                <Label text="Show my snapshots only" wrapperClassName="flex items-center" position="right">
                    <Switch checked={tableFilter.ownerId === userId} onChange={handleShowMySnapshotsOnlyChange} />
                </Label>
                <Label text="Hide deleted snapshots" wrapperClassName="flex items-center" position="right">
                    <Switch
                        checked={tableFilter.snapshotDeleted === false}
                        onChange={handleHideDeletedSnapshotsChange}
                    />
                </Label>
                <span className="grow" />
                <Tooltip title={"Open selected snapshot"} placement="top" enterDelay="medium">
                    <Button
                        color="primary"
                        disabled={!selectedSnapshotId || selectedSnapshot?.snapshotDeleted}
                        onClick={handleOpenSnapshotClick}
                        size="medium"
                    >
                        <FileOpen fontSize="inherit" /> Open
                    </Button>
                </Tooltip>
                <Tooltip title={deleteButtonTooltip} placement="top" enterDelay="medium">
                    <Button
                        color="danger"
                        disabled={!selectedSnapshotId || deletePending || !userId}
                        onClick={handleDeleteClick}
                        size="medium"
                    >
                        {deletePending ? <CircularProgress size="small" /> : <Delete fontSize="inherit" />}{" "}
                        {deleteButtonText}
                    </Button>
                </Tooltip>
                <Tooltip title="Refresh list" placement="top" enterDelay="medium">
                    <Button color="primary" onClick={refresh} size="medium">
                        {isRefreshing ? <CircularProgress size="small" /> : <Refresh fontSize="inherit" />} Refresh
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
                onVisibleRowRangeChange={handleTableScrollIndexChange}
                onSelectedRowsChange={(selection) => setSelectedSnapshotId(selection[0])}
            />
        </>
    );
}
