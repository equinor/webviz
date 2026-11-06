import React from "react";

import { Close, Delete, FileOpen, Refresh, Search } from "@mui/icons-material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash-es";

import type { GetSnapshotAccessLogsData_api, GraphUser_api, SnapshotAccessLog_api, Options } from "@api";
import { getSnapshotAccessLogsInfiniteOptions, getUserInfoOptions, SnapshotAccessLogSortBy_api } from "@api";
import { useUserInfo } from "@framework/internal/auth/hooks";
import type { UseRefreshQueryResult } from "@framework/internal/hooks/useRefreshQuery";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
import { buildWorkbenchUrl } from "@framework/internal/WorkbenchSession/utils/url";
import { edsDateRangeToIsoStringRange } from "@framework/utils/edsDateUtils";
import type { EdsDateRange } from "@framework/utils/edsDateUtils";
import type { Workbench } from "@framework/Workbench";
import { Avatar } from "@lib/components/Avatar";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DateRangePicker } from "@lib/components/DateRangePicker";
import { Field } from "@lib/components/Field";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { Table } from "@lib/components/Table";
import { TableCompositions } from "@lib/components/Table/compositions";
import { ROW_HEIGHT_PX } from "@lib/components/Table/constants";
import { SortDirection as TableSortDirection } from "@lib/components/Table/typesAndEnums";
import type { TableSortState } from "@lib/components/Table/typesAndEnums";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Virtualization } from "@lib/components/Virtualization";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
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

    const userId = useUserInfo()?.user_id;

    const [selectedSnapshots, setSelectedSnapshots] = React.useState<SnapshotAccessLog_api[]>([]);
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

    // Selected snapshots hidden by a filter would otherwise still be targeted by bulk deletion. The title is tracked both
    // as typed and once applied, since rows from the previous filter remain selectable during the debounce
    const filterCriteria = [
        immediateTitleFilterValue,
        titleFilterValue,
        visitedAtRange,
        onlyShowOwnSnapshots,
        hideDeletedSnapshots,
    ];
    const [prevFilterCriteria, setPrevFilterCriteria] = React.useState(filterCriteria);
    if (filterCriteria.some((criterion, index) => criterion !== prevFilterCriteria[index])) {
        setPrevFilterCriteria(filterCriteria);
        setSelectedSnapshots([]);
    }

    function handleClearTitleFilter() {
        setTitleFilterValue("");
    }

    async function handleDeleteClick() {
        if (!selectedSnapshots.length || !userId) return;

        // Only snapshots owned by the user, and not already deleted, can be deleted. The rest can only be removed from the list
        const toDelete = selectedSnapshots.filter((s) => s.snapshotMetadata.ownerId === userId && !s.snapshotDeleted);
        const toRemove = selectedSnapshots.filter((s) => !toDelete.includes(s));
        const toDeletionItem = (s: SnapshotAccessLog_api) => ({
            snapshotId: s.snapshotId,
            title: s.snapshotMetadata.title,
        });

        setDeletePending(true);

        const { deletedIds, removedIds } = await props.workbench
            .getSessionManager()
            .deleteOrRemoveSnapshots(toDelete.map(toDeletionItem), toRemove.map(toDeletionItem));

        setDeletePending(false);

        const handledIds = [...deletedIds, ...removedIds];
        if (!handledIds.length) return;

        setSelectedSnapshots((prev) => prev.filter((s) => !handledIds.includes(s.snapshotId)));
    }

    async function openSnapshot(snapshotId: string) {
        await props.workbench.getSessionManager().openSnapshot(snapshotId);
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
                        startAdornment={<Search />}
                        endAdornment={
                            <Tooltip content="Clear title filter" side="top">
                                <Button
                                    onClick={handleClearTitleFilter}
                                    size="small"
                                    variant="ghost"
                                    iconOnly
                                    tone="neutral"
                                >
                                    <Close />
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
                    <Tooltip
                        content={
                            selectedSnapshots.length > 1
                                ? `Delete or remove the ${selectedSnapshots.length} selected snapshots`
                                : "Delete or remove the selected snapshot"
                        }
                    >
                        {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                        <span>
                            <Button
                                variant="ghost"
                                tone="danger"
                                disabled={!selectedSnapshots.length || deletePending || !userId}
                                onClick={handleDeleteClick}
                                icon={deletePending ? <CircularProgress /> : <Delete />}
                            >
                                Delete
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip content="Refresh list">
                        <Button
                            variant="ghost"
                            tone="accent"
                            onClick={queryRefreshActionRef.current?.refresh}
                            icon={queryRefreshActionRef.current?.isRefreshing ? <CircularProgress /> : <Refresh />}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                </Tooltip.Provider>
            </div>

            <SnapshotTable
                selectedSnapshots={selectedSnapshots}
                active={props.active}
                titleFilter={titleFilterValue}
                lastVisitedAtFilter={visitedAtRange}
                showMySnapshotsOnly={onlyShowOwnSnapshots}
                hideDeletedSnapshots={hideDeletedSnapshots}
                refreshActionRef={queryRefreshActionRef}
                onSelectedSnapshotsChange={setSelectedSnapshots}
                onOpenSnapshot={openSnapshot}
            />
        </div>
    );
}

type SnapshotTableProps = {
    selectedSnapshots: SnapshotAccessLog_api[];
    active: boolean;
    titleFilter: string | null;
    lastVisitedAtFilter: EdsDateRange | null;
    showMySnapshotsOnly: boolean;
    hideDeletedSnapshots: boolean;

    refreshActionRef: React.RefObject<UseRefreshQueryResult | null>;

    onSelectedSnapshotsChange: (snapshots: SnapshotAccessLog_api[]) => void;
    onOpenSnapshot: (snapshotId: string) => void;
};

function SnapshotTable(props: SnapshotTableProps) {
    const { onSelectedSnapshotsChange } = props;

    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const userId = useUserInfo()?.user_id;

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableSortState, setTableSortState] = React.useState<TableSortState | null>(null);

    const queryFilterParams = React.useMemo<Options<GetSnapshotAccessLogsData_api>["query"]>(() => {
        const dateFilterRange = edsDateRangeToIsoStringRange(props.lastVisitedAtFilter) ?? undefined;

        return {
            filter_title: props.titleFilter,
            filter_last_visited_from: dateFilterRange?.from,
            filter_last_visited_to: dateFilterRange?.to,
            filter_owner_id: props.showMySnapshotsOnly ? userId : undefined,
            filter_snapshot_deleted: props.hideDeletedSnapshots ? false : undefined,
        };
    }, [props.lastVisitedAtFilter, props.titleFilter, props.showMySnapshotsOnly, props.hideDeletedSnapshots, userId]);

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

    const { fetchNextPage: fetchNextSnapshotPage } = snapshotsQuery;

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
                fetchNextSnapshotPage();
            }
        },
        [
            snapshotsQuery.isFetchingNextPage,
            snapshotsQuery.hasNextPage,
            tableData.length,
            visibleRowRange,
            fetchNextSnapshotPage,
        ],
    );

    const selectedSnapshotIds = React.useMemo(
        () => props.selectedSnapshots.map((s) => s.snapshotId),
        [props.selectedSnapshots],
    );

    React.useEffect(
        function maybeDeselectRemovedEntries() {
            // Only a settled, fully loaded result proves a missing entry was removed; otherwise it may be on an unloaded page
            if (!snapshotsQuery.isSuccess || snapshotsQuery.isFetching || snapshotsQuery.hasNextPage) return;

            const remaining = props.selectedSnapshots.filter((selected) =>
                tableData.some((s) => s.snapshotId === selected.snapshotId),
            );
            if (remaining.length !== props.selectedSnapshots.length) {
                onSelectedSnapshotsChange(remaining);
            }
        },
        [
            onSelectedSnapshotsChange,
            props.selectedSnapshots,
            tableData,
            snapshotsQuery.isSuccess,
            snapshotsQuery.isFetching,
            snapshotsQuery.hasNextPage,
        ],
    );

    const numSelectedLoadedSnapshots = tableData.filter((s) => selectedSnapshotIds.includes(s.snapshotId)).length;
    const allLoadedSnapshotsSelected = tableData.length > 0 && numSelectedLoadedSnapshots === tableData.length;
    const someLoadedSnapshotsSelected = numSelectedLoadedSnapshots > 0 && !allLoadedSnapshotsSelected;

    function handleToggleAllSelected(checked: boolean) {
        onSelectedSnapshotsChange(checked ? tableData : []);
    }

    function handleToggleSnapshotSelected(snapshot: SnapshotAccessLog_api, checked: boolean) {
        const otherSnapshots = props.selectedSnapshots.filter((s) => s.snapshotId !== snapshot.snapshotId);
        onSelectedSnapshotsChange(checked ? [...otherSnapshots, snapshot] : otherSnapshots);
    }

    function handleRowClick(snapshot: SnapshotAccessLog_api) {
        onSelectedSnapshotsChange([snapshot]);
    }

    return (
        <Table.Root
            layoutClassName="h-full"
            size="small"
            overflowWrapperRef={wrapperRef}
            sortable
            // Selection is fully controlled here; the table's own toggle-on-click handler is intentionally not used
            selectable="multiple"
            fixed
            columnSorting={tableSortState}
            rowSelection={selectedSnapshotIds}
            onChangeColumnSort={setTableSortState}
        >
            <Table.Head sticky>
                <Table.Column colKey="select" width={60} sortable={false} noPadding>
                    <div className="px-sm">
                        <Checkbox
                            size="small"
                            aria-label="Select all snapshots"
                            checked={allLoadedSnapshotsSelected}
                            indeterminate={someLoadedSnapshotsSelected}
                            disabled={tableData.length === 0}
                            onCheckedChange={handleToggleAllSelected}
                        />
                    </div>
                </Table.Column>
                <Table.Column
                    colKey="visits"
                    width={60}
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
                <Table.Column colKey="snapshotMetadata.description" sortable={false}>
                    Description
                </Table.Column>
                <Table.Column colKey="snapshotId" sortable={false} widthInPercent={12}>
                    URL
                </Table.Column>
                <Table.Column colKey="snapshotMetadata.ownerId" sortable={false} width={120}>
                    Owner
                </Table.Column>
                <Table.Column colKey="lastVisitedAt" width={160}>
                    Last visited at
                </Table.Column>
                <Table.Column colKey="actions" sortable={false} width={80} layoutClassName="text-right">
                    Actions
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
                            return (
                                <SnapshotRow
                                    key={item.snapshotId}
                                    item={item}
                                    selected={selectedSnapshotIds.includes(item.snapshotId)}
                                    onSelectedChange={handleToggleSnapshotSelected}
                                    onClick={handleRowClick}
                                    onOpen={props.onOpenSnapshot}
                                />
                            );
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

type SnapshotRowProps = {
    item: SnapshotAccessLog_api;
    selected: boolean;
    onSelectedChange: (snapshot: SnapshotAccessLog_api, selected: boolean) => void;
    onClick: (snapshot: SnapshotAccessLog_api) => void;
    onOpen: (snapshotId: string) => void;
};

function SnapshotRow(props: SnapshotRowProps) {
    const { item } = props;
    const ownerInfo = useUserGraphInfo(item.snapshotMetadata.ownerId);
    const name = ownerInfo?.principal_name?.split("@")?.[0].toLocaleLowerCase();
    const avatarFn = useUserAvatar(ownerInfo?.id ?? "", ownerInfo?.display_name);
    const url = buildWorkbenchUrl({ kind: "snapshot", snapshotId: item.snapshotId, dashboardId: null });

    const isDeleted = item.snapshotDeleted;

    return (
        <Table.Row
            rowKey={item.snapshotId}
            layoutClassName="group/snapshot-row"
            data-deleted={isDeleted ? "" : undefined}
            onClick={() => props.onClick(item)}
            onDoubleClick={(evt) => {
                // Buttons inside cells (e.g. copy URL) only stop click propagation, so their double-clicks still bubble here
                if (isDeleted || (evt.target as HTMLElement).closest("button")) return;
                props.onOpen(item.snapshotId);
            }}
        >
            {/* Stop propagation on the cell, since the checkbox also dispatches a click on its hidden input */}
            <Table.Cell onClick={(evt) => evt.stopPropagation()} onDoubleClick={(evt) => evt.stopPropagation()}>
                <Checkbox
                    size="small"
                    aria-label={`Select snapshot ${item.snapshotMetadata.title}`}
                    checked={props.selected}
                    onCheckedChange={(checked) => props.onSelectedChange(item, checked)}
                />
            </Table.Cell>
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
                            className="text-danger-subtle"
                        >
                            (Deleted)
                        </strong>
                    )}
                </div>
            </Table.Cell>
            <Table.Cell layoutClassName="group-data-deleted/snapshot-row:*:line-through">
                {item.snapshotMetadata.description || <span className="text-current/50 italic">N/A</span>}
            </Table.Cell>
            <Table.Cell layoutClassName="group-data-deleted/snapshot-row:line-through">
                <TableCompositions.CopyCellValue onCopyRequested={() => url}>
                    <div className="group relative flex h-full min-w-0 items-center" title={url}>
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</div>
                    </div>
                </TableCompositions.CopyCellValue>
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
            <Table.Cell
                noPadding
                // Row actions should not change the selection or trigger the row double-click
                onClick={(evt) => evt.stopPropagation()}
                onDoubleClick={(evt) => evt.stopPropagation()}
            >
                <div className="px-sm flex items-center justify-end">
                    <Tooltip content={isDeleted ? "Deleted snapshots cannot be opened" : "Open snapshot"} side="left">
                        {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                        <span>
                            <Button
                                variant="ghost"
                                tone="accent"
                                size="small"
                                iconOnly
                                aria-label={`Open snapshot ${item.snapshotMetadata.title}`}
                                disabled={isDeleted}
                                onClick={() => props.onOpen(item.snapshotId)}
                            >
                                <FileOpen style={{ fontSize: 16 }} />
                            </Button>
                        </span>
                    </Tooltip>
                </div>
            </Table.Cell>
        </Table.Row>
    );
}
