import React from "react";

import { Add, Close, Delete, Edit, FileOpen, Refresh, Search } from "@mui/icons-material";

import type { GetSessionsMetadataData_api, Options, SessionMetadata_api } from "@api";
import { SessionSortBy_api } from "@api";
import type { UseRefreshQueryResult } from "@framework/internal/hooks/useRefreshQuery";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { edsDateRangeToIsoStringRange } from "@framework/utils/edsDateUtils";
import type { EdsDateRange } from "@framework/utils/edsDateUtils";
import type { Workbench } from "@framework/Workbench";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { DateRangePicker } from "@lib/newComponents/DateRangePicker";
import { Field } from "@lib/newComponents/Field";
import { Table } from "@lib/newComponents/Table";
import { TableCompositions } from "@lib/newComponents/Table/compositions";
import { ROW_HEIGHT_PX } from "@lib/newComponents/Table/constants";
import type { TableSortState } from "@lib/newComponents/Table/typesAndEnums";
import { SortDirection as TableSortDirection } from "@lib/newComponents/Table/typesAndEnums";
import { TextInput } from "@lib/newComponents/TextInput";
import { Virtualization } from "@lib/newComponents/Virtualization";
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

    const [selectedSession, setSelectedSession] = React.useState<SessionMetadata_api | null>(null);
    const [editSessionDialogOpen, setEditSessionDialogOpen] = React.useState<boolean>(false);
    const [deletePending, setDeletePending] = React.useState<boolean>(false);

    const [titleFilterValue, setTitleFilterValue] = React.useState<string>("");
    const [updatedAtRange, setUpdatedAtRange] = React.useState<EdsDateRange | null>(null);

    const [immediateTitleFilterValue, setDebouncedTitleFilterValue] = useDebouncedOnChange(
        titleFilterValue,
        setTitleFilterValue,
        500,
    );

    function handleClearTitleFilter() {
        setTitleFilterValue("");
    }

    async function handleDeleteClick() {
        if (!selectedSession) return;

        setDeletePending(true);

        const success = await props.workbench.getSessionManager().deleteSession(selectedSession.id);
        setDeletePending(false);

        if (!success) {
            return;
        }

        setSelectedSession(null);
    }

    function handleEditClick() {
        if (!selectedSession) return;

        setEditSessionDialogOpen(true);
    }

    async function handleOpenSessionClick() {
        if (!selectedSession) return;

        await props.workbench.getSessionManager().openSession(selectedSession.id);
    }

    function handleNewSessionClick() {
        props.workbench.getSessionManager().startNewSession();
    }

    return (
        <div className="gap-vertical-sm flex h-full flex-col">
            <div className="gap-horizontal-sm flex">
                <Field.Root layoutClassName="grow">
                    <Field.Label>Filter by Title</Field.Label>
                    <TextInput
                        value={immediateTitleFilterValue}
                        placeholder="Search title"
                        onValueChange={setDebouncedTitleFilterValue}
                        startAdornment={<Search fontSize="inherit" />}
                        endAdornment={
                            <DenseIconButton onClick={handleClearTitleFilter} title="Clear filter">
                                <Close fontSize="inherit" />
                            </DenseIconButton>
                        }
                    />
                </Field.Root>
                <Field.Root>
                    <Field.Label>Updated at</Field.Label>
                    <DateRangePicker value={updatedAtRange ?? { from: null, to: null }} onChange={setUpdatedAtRange} />
                </Field.Root>
            </div>
            <div className="gap-horizontal-xs flex items-center">
                <Tooltip title="Start and open new session" placement="bottom" enterDelay="medium">
                    <Button tone="accent" onClick={handleNewSessionClick} variant="contained">
                        <Add fontSize="inherit" /> New session
                    </Button>
                </Tooltip>
                <span className="grow" />
                <Tooltip title="Edit the selected session" placement="bottom" enterDelay="medium">
                    <Button tone="accent" variant="ghost" disabled={!selectedSession} onClick={handleEditClick}>
                        <Edit fontSize="inherit" /> Edit
                    </Button>
                </Tooltip>
                <Tooltip title="Open the selected session" placement="bottom" enterDelay="medium">
                    <Button tone="accent" variant="ghost" disabled={!selectedSession} onClick={handleOpenSessionClick}>
                        <FileOpen fontSize="inherit" /> Open
                    </Button>
                </Tooltip>
                <Tooltip title="Delete the selected session" placement="bottom" enterDelay="medium">
                    <Button
                        tone="danger"
                        disabled={!selectedSession || deletePending}
                        onClick={handleDeleteClick}
                        variant="ghost"
                    >
                        {deletePending ? <CircularProgress size={16} /> : <Delete fontSize="inherit" />} Delete
                    </Button>
                </Tooltip>

                <Tooltip title="Refresh list" placement="top" enterDelay="medium">
                    <Button tone="accent" onClick={queryRefreshActionRef.current?.refresh} variant="ghost">
                        {queryRefreshActionRef.current?.isRefreshing ? (
                            <CircularProgress size={16} />
                        ) : (
                            <Refresh fontSize="inherit" />
                        )}{" "}
                        Refresh
                    </Button>
                </Tooltip>
            </div>

            <SessionTable
                selectedSession={selectedSession}
                active={props.active}
                titleFilter={titleFilterValue}
                updatedAtFilter={updatedAtRange}
                refreshActionRef={queryRefreshActionRef}
                onSelectedSessionChange={setSelectedSession}
            />
            <EditSessionMetadataDialog
                workbench={props.workbench}
                id={selectedSession?.id ?? null}
                open={editSessionDialogOpen}
                title={selectedSession?.title || ""}
                description={selectedSession?.description || ""}
                onClose={() => setEditSessionDialogOpen(false)}
            />
        </div>
    );
}
type SessionTableProps = {
    selectedSession: SessionMetadata_api | null;
    active: boolean;
    titleFilter: string | null;
    updatedAtFilter: EdsDateRange | null;
    refreshActionRef: React.RefObject<UseRefreshQueryResult | null>;
    onSelectedSessionChange: (session: SessionMetadata_api | null) => void;
};

function SessionTable(props: SessionTableProps) {
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const [visibleRowRange, setVisibleRowRange] = React.useState<{ start: number; end: number } | null>(null);
    const [tableSortState, setTableSortState] = React.useState<TableSortState>({});

    const queryFilterParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        const dateFilterRange = edsDateRangeToIsoStringRange(props.updatedAtFilter) ?? undefined;

        return {
            filter_title: props.titleFilter,
            filter_updated_from: dateFilterRange?.from,
            filter_updated_to: dateFilterRange?.to,
        };
    }, [props.titleFilter, props.updatedAtFilter]);

    const querySortingParams = React.useMemo<Options<GetSessionsMetadataData_api>["query"]>(() => {
        const [colKey, sortDirection] = Object.entries(tableSortState)[0] ?? [];

        if (!colKey || !sortDirection || sortDirection === TableSortDirection.NONE) return {};

        return {
            sort_by: columnIdToApiSortField(colKey),
            sort_direction: tableSortDirToApiSortDir(sortDirection),
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
            selectable
            fixed
            currentSort={tableSortState}
            selectedRow={props.selectedSession?.id ?? null}
            onChangeSortDirection={(col, dir) => setTableSortState({ [col]: dir })}
            onRowSelect={(sessionId) =>
                props.onSelectedSessionChange(tableData.find((s) => s.id === sessionId) ?? null)
            }
        >
            <Table.Head sticky>
                <Table.Column colKey="title" widthInPercent={20}>
                    Title
                </Table.Column>
                <Table.Column colKey="description" sortable={false} widthInPercent={50}>
                    Description
                </Table.Column>
                <Table.Column colKey="updatedAt" widthInPercent={15}>
                    Updated at
                </Table.Column>
                <Table.Column colKey="createdAt" widthInPercent={15}>
                    Created at
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
                    renderItem={(item, idx) => {
                        if (item === PENDING_ROW) {
                            return <TableCompositions.PendingRow key={`pending-row--${idx}`} />;
                        } else {
                            return <SessionRow item={item} />;
                        }
                    }}
                    onScroll={onTableScrollIndexChange}
                />
            </Table.Body>
        </Table.Root>
    );
}

function SessionRow(props: { item: SessionMetadata_api }) {
    const { item } = props;
    return (
        <Table.Row rowKey={item.id}>
            <Table.Cell>{item.title} </Table.Cell>
            <Table.Cell>{item.description || <span className="text-current/50 italic">N/A</span>}</Table.Cell>
            <Table.Cell>{formatDate(new Date(item.updatedAt))}</Table.Cell>
            <Table.Cell>{formatDate(new Date(item.createdAt))}</Table.Cell>
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
