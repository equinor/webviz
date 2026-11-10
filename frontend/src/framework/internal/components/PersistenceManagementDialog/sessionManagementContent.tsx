import React from "react";

import { Add, Close, Delete, Edit, FileOpen, Refresh, Search } from "@mui/icons-material";

import type { GetSessionsMetadataData_api, Options, SessionMetadata_api } from "@api";
import { SessionSortBy_api } from "@api";
import type { UseRefreshQueryResult } from "@framework/internal/hooks/useRefreshQuery";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { edsDateRangeToIsoStringRange } from "@framework/utils/edsDateUtils";
import type { EdsDateRange } from "@framework/utils/edsDateUtils";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DateRangePicker } from "@lib/components/DateRangePicker";
import { Field } from "@lib/components/Field";
import { Hidden } from "@lib/components/Hidden";
import { Separator } from "@lib/components/Separator";
import { Table } from "@lib/components/Table";
import { TableCompositions } from "@lib/components/Table/compositions";
import { ROW_HEIGHT_PX } from "@lib/components/Table/constants";
import type { TableSortState } from "@lib/components/Table/typesAndEnums";
import { SortDirection as TableSortDirection } from "@lib/components/Table/typesAndEnums";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { Virtualization } from "@lib/components/Virtualization";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { formatDate } from "@lib/utils/dates";

import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";

import { tableSortDirToApiSortDir, useInfiniteSessionMetadataQuery } from "./_utils";
import { NEXT_PAGE_THRESHOLD, PENDING_PAGE, PENDING_ROW } from "./constants";

export type SessionOverviewContentProps = {
    workbench: Workbench;
    active: boolean;
};

export function SessionManagementContent(props: SessionOverviewContentProps): React.ReactNode {
    const queryRefreshActionRef = React.useRef<UseRefreshQueryResult>(null);

    const [selectedSessions, setSelectedSessions] = React.useState<SessionMetadata_api[]>([]);
    const [editingSession, setEditingSession] = React.useState<SessionMetadata_api | null>(null);
    const [editSessionDialogOpen, setEditSessionDialogOpen] = React.useState<boolean>(false);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [titleFilterValue, setTitleFilterValue] = React.useState<string>("");
    const [updatedAtRange, setUpdatedAtRange] = React.useState<EdsDateRange | null>(null);

    const [immediateTitleFilterValue, setDebouncedTitleFilterValue] = useDebouncedOnChange(
        titleFilterValue,
        setTitleFilterValue,
        500,
    );

    // Selected sessions hidden by a filter would otherwise still be targeted by bulk deletion. The title is tracked both
    // as typed and once applied, since rows from the previous filter remain selectable during the debounce
    const filterCriteria = [immediateTitleFilterValue, titleFilterValue, updatedAtRange];
    const [prevFilterCriteria, setPrevFilterCriteria] = React.useState(filterCriteria);
    if (filterCriteria.some((criterion, index) => criterion !== prevFilterCriteria[index])) {
        setPrevFilterCriteria(filterCriteria);
        setSelectedSessions([]);
    }

    function handleClearTitleFilter() {
        setTitleFilterValue("");
    }

    async function handleDeleteClick() {
        if (!selectedSessions.length) return;

        setDeletePending(true);

        const deletedIds = await props.workbench
            .getSessionManager()
            .deleteSessions(selectedSessions.map((s) => ({ sessionId: s.id, title: s.title })));
        setDeletePending(false);

        if (!deletedIds.length) return;

        setSelectedSessions((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
    }

    async function deleteSession(session: SessionMetadata_api) {
        setDeletePending(true);

        const deletedIds = await props.workbench
            .getSessionManager()
            .deleteSessions([{ sessionId: session.id, title: session.title }]);
        setDeletePending(false);

        if (!deletedIds.length) return;

        setSelectedSessions((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
    }

    function editSession(session: SessionMetadata_api) {
        setEditingSession(session);
        setEditSessionDialogOpen(true);
    }

    async function openSession(sessionId: string) {
        await props.workbench.getSessionManager().openSession(sessionId);
    }

    function handleNewSessionClick() {
        props.workbench.getSessionManager().startNewSession();
    }

    function handleClearSelectionClick() {
        setSelectedSessions([]);
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
                                    tone="neutral"
                                    iconOnly
                                >
                                    <Close />
                                </Button>
                            </Tooltip>
                        }
                    />
                </Field.Root>
                <Field.Root>
                    <Field.Label>Updated at</Field.Label>
                    <DateRangePicker value={updatedAtRange ?? { from: null, to: null }} onChange={setUpdatedAtRange} />
                </Field.Root>
            </div>
            <div className="gap-x-4xs flex items-center">
                <Tooltip.Provider side="bottom">
                    <Tooltip content="Start and open new session">
                        <Button tone="accent" onClick={handleNewSessionClick} variant="contained" icon={<Add />}>
                            New session
                        </Button>
                    </Tooltip>
                    <span className="grow" />
                    <Hidden hidden={!selectedSessions.length}>
                        <span className="gap-x-sm flex items-center">
                            <Typography tone="neutral" size="sm">
                                {selectedSessions.length} selected session{selectedSessions.length !== 1 ? "s" : ""}
                            </Typography>
                            <Button onClick={handleClearSelectionClick} size="small" variant="ghost">
                                Clear
                            </Button>
                        </span>
                        <Separator orientation="vertical" />
                    </Hidden>
                    <Tooltip
                        content={
                            selectedSessions.length > 1
                                ? `Delete the ${selectedSessions.length} selected sessions`
                                : "Delete the selected session"
                        }
                    >
                        <Button
                            tone="danger"
                            disabled={!selectedSessions.length || deletePending}
                            focusableWhenDisabled
                            onClick={handleDeleteClick}
                            variant="ghost"
                            icon={deletePending ? <CircularProgress /> : <Delete />}
                        >
                            Delete
                        </Button>
                    </Tooltip>

                    <Tooltip content="Refresh list">
                        <Button
                            tone="accent"
                            onClick={queryRefreshActionRef.current?.refresh}
                            variant="ghost"
                            icon={queryRefreshActionRef.current?.isRefreshing ? <CircularProgress /> : <Refresh />}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                </Tooltip.Provider>
            </div>

            <SessionTable
                selectedSessions={selectedSessions}
                active={props.active}
                titleFilter={titleFilterValue}
                updatedAtFilter={updatedAtRange}
                refreshActionRef={queryRefreshActionRef}
                deletePending={deletePending}
                onSelectedSessionsChange={setSelectedSessions}
                onOpenSession={openSession}
                onEditSession={editSession}
                onDeleteSession={deleteSession}
            />
            <EditSessionMetadataDialog
                workbench={props.workbench}
                id={editingSession?.id ?? null}
                open={editSessionDialogOpen}
                title={editingSession?.title || ""}
                description={editingSession?.description || ""}
                onClose={() => setEditSessionDialogOpen(false)}
            />
        </div>
    );
}
type SessionTableProps = {
    selectedSessions: SessionMetadata_api[];
    active: boolean;
    titleFilter: string | null;
    updatedAtFilter: EdsDateRange | null;
    refreshActionRef: React.RefObject<UseRefreshQueryResult | null>;
    deletePending: boolean;
    onSelectedSessionsChange: (sessions: SessionMetadata_api[]) => void;
    onOpenSession: (sessionId: string) => void;
    onEditSession: (session: SessionMetadata_api) => void;
    onDeleteSession: (session: SessionMetadata_api) => void;
};

function SessionTable(props: SessionTableProps) {
    const { onSelectedSessionsChange } = props;

    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableSortState, setTableSortState] = React.useState<TableSortState | null>(null);

    const queryFilterParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        const dateFilterRange = edsDateRangeToIsoStringRange(props.updatedAtFilter) ?? undefined;

        return {
            filter_title: props.titleFilter,
            filter_updated_from: dateFilterRange?.from,
            filter_updated_to: dateFilterRange?.to,
        };
    }, [props.titleFilter, props.updatedAtFilter]);

    const querySortingParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        const { columnKey, direction } = tableSortState ?? {};

        if (!columnKey || !direction || direction === TableSortDirection.NONE) return {};

        return {
            sort_by: columnIdToApiSortField(columnKey),
            sort_direction: tableSortDirToApiSortDir(direction),
        };
    }, [tableSortState]);

    const queryCollationParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        return {
            ...queryFilterParams,
            ...querySortingParams,
        };
    }, [queryFilterParams, querySortingParams]);

    const sessionsQuery = useInfiniteSessionMetadataQuery(queryCollationParams, props.active);

    const queryRefreshAction = useRefreshQuery(sessionsQuery);
    React.useImperativeHandle(props.refreshActionRef, () => queryRefreshAction, [queryRefreshAction]);

    const tableData = React.useMemo(() => {
        if (!sessionsQuery.data) return [];

        return sessionsQuery.data.pages?.flatMap(({ items }) => items);
    }, [sessionsQuery.data]);

    const tableDataWithPendingRows = React.useMemo(() => {
        if (!(sessionsQuery.isLoading || sessionsQuery.isFetchingNextPage)) return tableData;

        return [...tableData, ...PENDING_PAGE];
    }, [sessionsQuery.isFetchingNextPage, sessionsQuery.isLoading, tableData]);

    const selectedSessionIds = React.useMemo(() => props.selectedSessions.map((s) => s.id), [props.selectedSessions]);

    React.useEffect(
        function maybeSyncSelectedSessionsEffect() {
            const settled = sessionsQuery.isSuccess && !sessionsQuery.isFetching;
            const synced = props.selectedSessions.flatMap((selected) => {
                const fresh = tableData.find((s) => s.id === selected.id);
                // Also drop entries that may exist on unloaded pages: rows the user can't see must not stay deletable
                if (!fresh) return settled ? [] : [selected];
                return [fresh];
            });
            const changed =
                synced.length !== props.selectedSessions.length ||
                synced.some((s, i) => s !== props.selectedSessions[i]);
            if (changed) {
                // Deliberately in an effect: entries can change or disappear on refetch without any user event to react to
                onSelectedSessionsChange(synced);
            }
        },
        [
            onSelectedSessionsChange,
            props.selectedSessions,
            sessionsQuery.isSuccess,
            sessionsQuery.isFetching,
            tableData,
        ],
    );

    function handleToggleSessionSelected(session: SessionMetadata_api, checked: boolean) {
        const otherSessions = props.selectedSessions.filter((s) => s.id !== session.id);
        props.onSelectedSessionsChange(checked ? [...otherSessions, session] : otherSessions);
    }

    function handleRowClick(session: SessionMetadata_api) {
        props.onSelectedSessionsChange([session]);
    }

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
        // TODO - Future work: Could be nice to show/filter on modules used, but need backend changes and virtual table columns to support that
        // {
        //     _type: "virtual",
        //     columnId: "modules" as keyof SessionMetadataWithId_api,
        //     label: "Modules",
        //     sizeInPercent: 15,
        //     filter: false,
        // },
        <Table.Root
            layoutClassName="h-full"
            size="small"
            overflowWrapperRef={wrapperRef}
            sortable
            // Selection is fully controlled here; the table's own toggle-on-click handler is intentionally not used
            selectable="multiple"
            fixed
            columnSorting={tableSortState}
            rowSelection={selectedSessionIds}
            onChangeColumnSort={setTableSortState}
        >
            <Table.Head sticky>
                <Table.Column colKey="select" width={60} sortable={false} />
                <Table.Column colKey="title" widthInPercent={25}>
                    Title
                </Table.Column>
                <Table.Column colKey="description" sortable={false}>
                    Description
                </Table.Column>
                <Table.Column colKey="updatedAt" width={160}>
                    Updated at
                </Table.Column>
                <Table.Column colKey="createdAt" width={160}>
                    Created at
                </Table.Column>
                <Table.Column colKey="actions" sortable={false} width={100}>
                    Actions
                </Table.Column>
            </Table.Head>
            <Table.Body emptyMessage="No sessions found.">
                <Virtualization
                    // ! Note the implementation here, to support both a virtualized container AND a pending rows at the same time, we need to let the virtualizer handle each item so it knows how much padding is needed.
                    containerRef={wrapperRef}
                    placeholderComponent="tr"
                    items={tableDataWithPendingRows}
                    itemSize={ROW_HEIGHT_PX["small"]}
                    direction="vertical"
                    renderItem={(item: SessionMetadata_api | typeof PENDING_ROW, idx) => {
                        if (item === PENDING_ROW) {
                            return <TableCompositions.PendingRow key={`pending-row--${idx}`} />;
                        } else {
                            return (
                                <SessionRow
                                    key={item.id}
                                    item={item}
                                    selected={selectedSessionIds.includes(item.id)}
                                    deletePending={props.deletePending}
                                    onSelectedChange={handleToggleSessionSelected}
                                    onClick={handleRowClick}
                                    onDoubleClick={props.onOpenSession}
                                    onOpen={props.onOpenSession}
                                    onEdit={props.onEditSession}
                                    onDelete={props.onDeleteSession}
                                />
                            );
                        }
                    }}
                    onScroll={onTableScrollIndexChange}
                />
            </Table.Body>
        </Table.Root>
    );
}

type SessionRowProps = {
    item: SessionMetadata_api;
    selected: boolean;
    deletePending: boolean;
    onSelectedChange: (session: SessionMetadata_api, selected: boolean) => void;
    onClick: (session: SessionMetadata_api) => void;
    onDoubleClick: (sessionId: string) => void;
    onOpen: (sessionId: string) => void;
    onEdit: (session: SessionMetadata_api) => void;
    onDelete: (session: SessionMetadata_api) => void;
};

function SessionRow(props: SessionRowProps) {
    const { item } = props;
    return (
        <Table.Row
            rowKey={item.id}
            onClick={() => props.onClick(item)}
            onDoubleClick={() => props.onDoubleClick(item.id)}
        >
            {/* Stop propagation on the cell, since the checkbox also dispatches a click on its hidden input */}
            <Table.Cell
                onClick={(evt) => evt.stopPropagation()}
                onDoubleClick={(evt) => evt.stopPropagation()}
                noPadding
                layoutClassName="px-sm"
            >
                <Checkbox
                    size="small"
                    aria-label={`Select session ${item.title}`}
                    checked={props.selected}
                    onCheckedChange={(checked) => props.onSelectedChange(item, checked)}
                />
            </Table.Cell>
            <Table.Cell>{item.title} </Table.Cell>
            <Table.Cell>{item.description || <span className="text-current/50 italic">N/A</span>}</Table.Cell>
            <Table.Cell>{formatDate(new Date(item.updatedAt))}</Table.Cell>
            <Table.Cell>{formatDate(new Date(item.createdAt))}</Table.Cell>
            <Table.Cell
                noPadding
                // Row actions should not change the selection or trigger the row double-click
                onClick={(evt) => evt.stopPropagation()}
                onDoubleClick={(evt) => evt.stopPropagation()}
            >
                <div className="px-sm gap-x-3xs flex items-center">
                    <Tooltip content="Open session" side="top">
                        <Button
                            variant="ghost"
                            tone="accent"
                            size="small"
                            iconOnly
                            aria-label={`Open session ${item.title}`}
                            onClick={() => props.onOpen(item.id)}
                        >
                            <FileOpen style={{ fontSize: 16 }} />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Edit title and description" side="top">
                        <Button
                            variant="ghost"
                            tone="accent"
                            size="small"
                            iconOnly
                            aria-label={`Edit session ${item.title}`}
                            onClick={() => props.onEdit(item)}
                        >
                            <Edit style={{ fontSize: 16 }} />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Delete session" side="top">
                        <Button
                            variant="ghost"
                            tone="danger"
                            size="small"
                            iconOnly
                            aria-label={`Delete session ${item.title}`}
                            disabled={props.deletePending}
                            focusableWhenDisabled
                            onClick={() => props.onDelete(item)}
                        >
                            <Delete style={{ fontSize: 16 }} />
                        </Button>
                    </Tooltip>
                </div>
            </Table.Cell>
        </Table.Row>
    );
}

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
