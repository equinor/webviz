import React from "react";

import { Close, Delete, FileOpen, Refresh, Search } from "@mui/icons-material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash";

import type { GetSnapshotAccessLogsData_api, GraphUser_api, SnapshotAccessLog_api, Options } from "@api";
import { getSnapshotAccessLogsInfiniteOptions, getUserInfoOptions, SnapshotAccessLogSortBy_api } from "@api";
import type { UseRefreshQueryResult } from "@framework/internal/hooks/useRefreshQuery";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/utils/url";
import { edsDateRangeToIsoStringRange } from "@framework/utils/edsDateUtils";
import type { EdsDateRange } from "@framework/utils/edsDateUtils";
import type { Workbench } from "@framework/Workbench";
import { CopyCellValue } from "@lib/components/Table/column-components/CopyCellValue";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { Avatar } from "@lib/newComponents/Avatar";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { DateRangePicker } from "@lib/newComponents/DateRangePicker";
import { Field } from "@lib/newComponents/Field";
import { SwitchCompositions } from "@lib/newComponents/Switch/compositions";
import { Table } from "@lib/newComponents/Table";
import { TableCompositions } from "@lib/newComponents/Table/compositions";
import { ROW_HEIGHT_PX } from "@lib/newComponents/Table/constants";
import { SortDirection as TableSortDirection } from "@lib/newComponents/Table/typesAndEnums";
import type { TableSortState } from "@lib/newComponents/Table/typesAndEnums";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Virtualization } from "@lib/newComponents/Virtualization";
import { formatDate } from "@lib/utils/dates";

import { tableSortDirToApiSortDir } from "./_utils";
import { NEXT_PAGE_THRESHOLD, PENDING_PAGE, PENDING_ROW, QUERY_PAGE_SIZE } from "./constants";

// The table comp doesn't support nested object key paths, so we transform the data into a flattened object
type FlattenedSnapshotAccessLog_api = Omit<SnapshotAccessLog_api, "snapshotMetadata"> & {
    [K in keyof SnapshotAccessLog_api["snapshotMetadata"] as `snapshotMetadata.${Extract<K, string>}`]: SnapshotAccessLog_api["snapshotMetadata"][K];
};

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
    const queryRefreshActionRef = React.useRef<UseRefreshQueryResult>(null);

    const userId = useAuthProvider().userInfo?.user_id;

    const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotAccessLog_api | null>(null);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [titleFilterValue, setTitleFilterValue] = React.useState<string>("");
    const [visitedAtRange, setVisitedAtRange] = React.useState<EdsDateRange | null>(null);
    const [onlyShowOwnSnapshots, setOnlyShowOwnSnapshots] = React.useState(false);
    const [hideDeletedSnapshots, setHideDeletedSnapshots] = React.useState(false);

    const [immediateTitleFilterValue, setDebouncedTitleFilterValue] = useDebouncedOnChange(
        titleFilterValue,
        setTitleFilterValue,
        500,
    );

    function handleClearTitleFilter() {
        setTitleFilterValue("");
    }

    async function handleDeleteClick() {
        if (!selectedSnapshot || !userId) return;

        const snapshotOwnerId = selectedSnapshot.snapshotMetadata.ownerId;

        setDeletePending(true);

        let success: boolean;
        if (userId === snapshotOwnerId) {
            success = await props.workbench.getSessionManager().deleteSnapshot(selectedSnapshot.snapshotId);
        } else {
            success = await props.workbench.getSessionManager().deleteSnapshotAccessLog(selectedSnapshot.snapshotId);
        }

        setDeletePending(false);

        if (!success) {
            return;
        }

        setSelectedSnapshot(null);
    }

    async function handleOpenSnapshotClick() {
        if (!selectedSnapshot) return;

        await props.workbench.getSessionManager().openSnapshot(selectedSnapshot.snapshotId);
    }

    let deleteButtonText = "Delete snapshot";
    let deleteButtonTooltip = "Delete selected snapshot (permanently removes it for all users)";
    if (selectedSnapshot && selectedSnapshot.snapshotMetadata.ownerId !== userId) {
        deleteButtonText = "Remove from list";
        deleteButtonTooltip =
            "Remove snapshot from list (you are not the owner, snapshot will remain accessible to other users)";
    }
    return (
        <div className="gap-y-sm flex h-full flex-col">
            <div className="gap-x-sm flex">
                <Field.Root layoutClassName="grow">
                    <Field.Label>Filter by Title</Field.Label>
                    <TextInput
                        value={immediateTitleFilterValue}
                        placeholder="Search title"
                        onValueChange={setDebouncedTitleFilterValue}
                        startAdornment={<Search fontSize="inherit" />}
                        endAdornment={
                            <Tooltip content="Clear title filter" side="top">
                                <Button
                                    onClick={handleClearTitleFilter}
                                    size="small"
                                    variant="ghost"
                                    iconOnly
                                    tone="neutral"
                                >
                                    <Close fontSize="inherit" />
                                </Button>
                            </Tooltip>
                        }
                    />
                </Field.Root>
                <Field.Root>
                    <Field.Label>Last visited</Field.Label>
                    <DateRangePicker value={visitedAtRange ?? { from: null, to: null }} onChange={setVisitedAtRange} />
                </Field.Root>
            </div>
            <div className="gap-x-4xs flex items-center">
                <SwitchCompositions.WithLabel
                    checked={onlyShowOwnSnapshots}
                    label="Show my snapshots only"
                    size="small"
                    onCheckedChange={setOnlyShowOwnSnapshots}
                />

                <SwitchCompositions.WithLabel
                    checked={hideDeletedSnapshots}
                    label="Hide deleted snapshots"
                    size="small"
                    onCheckedChange={setHideDeletedSnapshots}
                />
                <span className="grow" />
                <Tooltip.Provider side="bottom">
                    <Tooltip content="Open selected snapshot">
                        <Button
                            variant="ghost"
                            tone="accent"
                            disabled={!selectedSnapshot || selectedSnapshot?.snapshotDeleted}
                            onClick={handleOpenSnapshotClick}
                        >
                            <FileOpen className="self-end" /> Open
                        </Button>
                    </Tooltip>
                    <Tooltip content={deleteButtonTooltip}>
                        <Button
                            variant="ghost"
                            tone="danger"
                            disabled={!selectedSnapshot || deletePending || !userId}
                            onClick={handleDeleteClick}
                        >
                            {deletePending ? (
                                <CircularProgress layoutClassName="self-end" size="em" />
                            ) : (
                                <Delete className="self-end" />
                            )}{" "}
                            {deleteButtonText}
                        </Button>
                    </Tooltip>
                    <Tooltip content="Refresh list">
                        <Button variant="ghost" tone="accent" onClick={queryRefreshActionRef.current?.refresh}>
                            {queryRefreshActionRef.current?.isRefreshing ? (
                                <CircularProgress layoutClassName="self-end" size="em" />
                            ) : (
                                <Refresh className="self-end" />
                            )}{" "}
                            Refresh
                        </Button>
                    </Tooltip>
                </Tooltip.Provider>
            </div>

            <SnapshotTable
                selectedSnapshot={selectedSnapshot}
                active={props.active}
                titleFilter={titleFilterValue}
                lastVisitedAtFilter={visitedAtRange}
                showMySnapshotsOnly={onlyShowOwnSnapshots}
                hideDeletedSnapshots={hideDeletedSnapshots}
                refreshActionRef={queryRefreshActionRef}
                onSelectedSnapshotChange={setSelectedSnapshot}
            />
        </div>
    );
}

type SnapshotTableProps = {
    selectedSnapshot: SnapshotAccessLog_api | null;
    active: boolean;
    titleFilter: string | null;
    lastVisitedAtFilter: EdsDateRange | null;
    showMySnapshotsOnly: boolean;
    hideDeletedSnapshots: boolean;

    refreshActionRef: React.RefObject<UseRefreshQueryResult | null>;

    onSelectedSnapshotChange: (snapshotId: SnapshotAccessLog_api | null) => void;
};

function SnapshotTable(props: SnapshotTableProps) {
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableSortState, setTableSortState] = React.useState<TableSortState | null>(null);

    const queryFilterParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
        const dateFilterRange = edsDateRangeToIsoStringRange(props.lastVisitedAtFilter) ?? undefined;

        return {
            filter_title: props.titleFilter,
            filter_last_visited_from: dateFilterRange?.from,
            filter_last_visited_to: dateFilterRange?.to,
            filter_owner_id: props.showMySnapshotsOnly ? props.selectedSnapshot?.snapshotMetadata.ownerId : undefined,
            filter_snapshot_deleted: props.hideDeletedSnapshots ? false : undefined,
        };
    }, [
        props.titleFilter,
        props.lastVisitedAtFilter,
        props.showMySnapshotsOnly,
        props.hideDeletedSnapshots,
        props.selectedSnapshot?.snapshotMetadata.ownerId,
    ]);

    const querySortingParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
        const { columnKey, direction } = tableSortState ?? {};

        if (!columnKey || !direction || direction === TableSortDirection.NONE) return {};

        return {
            sort_by: columnIdToApiSortField(columnKey),
            sort_direction: tableSortDirToApiSortDir(direction),
        };
    }, [tableSortState]);

    const queryCollationParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
        return {
            ...queryFilterParams,
            ...querySortingParams,
        };
    }, [queryFilterParams, querySortingParams]);

    const snapshotsQuery = useInfiniteQuery({
        ...getSnapshotAccessLogsInfiniteOptions({
            query: { ...queryCollationParams, page_size: QUERY_PAGE_SIZE },
        }),
        initialPageParam: "",
        refetchInterval: 10000,
        getNextPageParam(lastPage) {
            return lastPage.pageToken;
        },
        enabled: props.active,
    });

    const queryRefreshAction = useRefreshQuery(snapshotsQuery);
    React.useImperativeHandle(props.refreshActionRef, () => queryRefreshAction, [queryRefreshAction]);

    const tableData = React.useMemo(() => {
        if (!snapshotsQuery.data) return [];

        return snapshotsQuery.data.pages?.flatMap(({ items }) => items);
    }, [snapshotsQuery.data]);

    const tableDataWithPendingRows = React.useMemo(() => {
        if (!(snapshotsQuery.isLoading || snapshotsQuery.isFetchingNextPage)) return tableData;

        return [...tableData, ...PENDING_PAGE];
    }, [snapshotsQuery.isFetchingNextPage, snapshotsQuery.isLoading, tableData]);

    const onTableScrollIndexChange = React.useCallback((start: number, end: number) => {
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

    return (
        <Table.Root
            layoutClassName="h-full"
            size="small"
            overflowWrapperRef={wrapperRef}
            sortable
            selectable
            fixed
            columnSorting={tableSortState}
            rowSelection={props.selectedSnapshot?.snapshotId ?? null}
            onChangeColumnSort={setTableSortState}
            onChangeRowSelection={(snapshotId) =>
                props.onSelectedSnapshotChange(tableData.find((s) => s.snapshotId === snapshotId) ?? null)
            }
        >
            <Table.Head sticky>
                <Table.Column
                    colKey="visits"
                    widthInPercent={7}
                    // The sorting adornment require some space, which normally looks a bit weirdly aligned
                    // for as the column text here is centered. We remove the right side padding to make the
                    // alignment look more natural in the un-sorted state
                    layoutClassName="text-center! pr-0!"
                >
                    Visits
                </Table.Column>
                <Table.Column colKey="snapshotMetadata.title" widthInPercent={24}>
                    Title
                </Table.Column>
                <Table.Column colKey="snapshotMetadata.description" sortable={false} widthInPercent={26}>
                    Description
                </Table.Column>
                <Table.Column colKey="snapshotId" sortable={false} widthInPercent={12}>
                    URL
                </Table.Column>
                <Table.Column colKey="snapshotMetadata.ownerId" sortable={false} widthInPercent={11}>
                    Owner
                </Table.Column>
                <Table.Column colKey="lastVisitedAt" widthInPercent={20}>
                    Last visited at
                </Table.Column>
            </Table.Head>
            <Table.Body emptyMessage="No snapshots found.">
                <Virtualization
                    containerRef={wrapperRef}
                    placeholderComponent="tr"
                    items={tableDataWithPendingRows}
                    itemSize={ROW_HEIGHT_PX["small"]}
                    direction="vertical"
                    renderItem={(item, idx) => {
                        if (item === PENDING_ROW) {
                            return <TableCompositions.PendingRow key={`pending-row--${idx}`} />;
                        } else {
                            return <SnapshotRow key={item.snapshotId} item={item} />;
                        }
                    }}
                    onScroll={onTableScrollIndexChange}
                />
                <TableCompositions.PendingRows
                    rowCount={snapshotsQuery.isLoading || snapshotsQuery.isFetchingNextPage ? QUERY_PAGE_SIZE : 0}
                />
            </Table.Body>
        </Table.Root>
    );
}

function SnapshotRow(props: { item: SnapshotAccessLog_api }) {
    const { item } = props;
    const ownerInfo = useUserGraphInfo(item.snapshotMetadata.ownerId);
    const name = ownerInfo?.principal_name?.split("@")?.[0].toLocaleLowerCase();
    const avatarFn = useUserAvatar(name ?? "", ownerInfo?.display_name);
    const url = buildSnapshotUrl(item.snapshotId);

    const isDeleted = item.snapshotDeleted;

    return (
        <Table.Row
            rowKey={item.snapshotMetadata.id}
            layoutClassName="group/snapshot-row"
            data-deleted={isDeleted ? "" : undefined}
        >
            <Table.Cell layoutClassName="text-center! group-data-deleted/snapshot-row:line-through">
                {item.visits}
            </Table.Cell>
            <Table.Cell title={item.snapshotMetadata.title}>
                <div className="gap-x-4xs flex items-center justify-between">
                    <span className="truncate overflow-hidden group-data-deleted/snapshot-row:line-through">
                        {item.snapshotMetadata.title}
                    </span>
                    {isDeleted && (
                        <strong
                            title="This snapshot has been deleted by the snapshot owner"
                            className="text-danger-subtle group-data-selected/snapshot-row:text-danger-strong-on-emphasis"
                        >
                            (Deleted)
                        </strong>
                    )}
                </div>
            </Table.Cell>
            <Table.Cell layoutClassName="group-data-deleted/snapshot-row:*:line-through">
                {item.snapshotMetadata.description || (
                    <span className="italic group-not-data-selected/snapshot-row:text-current/50">N/A</span>
                )}
            </Table.Cell>
            <Table.Cell layoutClassName="group-data-deleted/snapshot-row:line-through">
                <CopyCellValue onCopyRequested={() => url}>
                    <div className="group relative flex h-full min-w-0 items-center" title={url}>
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</div>
                    </div>
                </CopyCellValue>
            </Table.Cell>
            <Table.Cell noPadding>
                <div className="px-sm gap-x-xs flex items-center">
                    <Avatar userData={avatarFn} size={24} />
                    <span className="group-data-deleted/snapshot-row:line-through">{name}</span>
                </div>
            </Table.Cell>
            <Table.Cell layoutClassName="group-data-deleted/snapshot-row:line-through">
                {item.lastVisitedAt ? (
                    formatDate(new Date(item.lastVisitedAt))
                ) : (
                    <span className="text-current/50 italic">N/A</span>
                )}
            </Table.Cell>
        </Table.Row>
    );
}
