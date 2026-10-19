import React from "react";

import { Clear, Download } from "@mui/icons-material";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { Button } from "@lib/components/Button";
import { Table } from "@lib/components/Table";
import { TableCompositions } from "@lib/components/Table/compositions";
import type { TableSortState } from "@lib/components/Table/typesAndEnums";
import { TextInput } from "@lib/components/TextInput";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useElementSize } from "@lib/hooks/useElementSize";
import { PHASE_COLORS } from "@modules/_shared/constants/colors";
import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";

import type { TableColumnsConfig, TableHeading, TableRow } from "../types";
import { collectLeafColumns, formatEnsembleIdent, isValidFluidType } from "../utils/tableComponentUtils";
import type { ColumnLayout, FilterState, SortScope } from "../utils/tableLayoutUtils";
import {
    applyTableSort,
    CATEGORY_COLUMN_MAX_WIDTH_PX,
    computeColumnPinning,
    computeColumnWidths,
    pruneHiddenColumnFilters,
} from "../utils/tableLayoutUtils";

export type InplaceVolumesTableProps = {
    ensembleSet: EnsembleSet;
    columnsConfig: TableColumnsConfig;
    rows: TableRow<TableColumnsConfig>[];

    /** When set, sorting by result columns is applied within each value of this column */
    sortScopeColumnKey?: string;

    onHover: (row: TableRow<TableColumnsConfig> | null) => void;

    /** Called with the currently filtered and sorted rows (all of them, not only the virtualized viewport) */
    onDownload?: (rows: TableRow<TableColumnsConfig>[]) => void;
};

const FILTER_DEBOUNCE_TIME_MS = 250;

export function InplaceVolumesTable(props: InplaceVolumesTableProps): React.ReactNode {
    const [tableSortState, setTableSortState] = React.useState<TableSortState[]>([]);
    const [tableFilterState, setTableFilterState] = React.useState<FilterState>({});

    const tableWrapperRef = React.useRef<HTMLDivElement>(null);
    const { width: tableWrapperWidthPx } = useElementSize(tableWrapperRef);

    const formatDisplayValue = React.useCallback(
        function formatDisplayValue(value: string | number | null, heading: TableHeading): string {
            if (heading.columnType === ColumnType.ENSEMBLE) return formatEnsembleIdent(value, props.ensembleSet);
            return value === null ? "-" : String(value);
        },
        [props.ensembleSet],
    );

    // Constant columns are detected on the unfiltered rows, so typing a filter never hides a column
    const columnWidths = React.useMemo(
        () => computeColumnWidths(props.columnsConfig, props.rows, formatDisplayValue),
        [props.columnsConfig, props.rows, formatDisplayValue],
    );

    // Pinning is the only part of the layout that depends on the wrapper width, so resizing does not rescan the rows
    const columnPinning = React.useMemo(
        () => computeColumnPinning(columnWidths, tableWrapperWidthPx),
        [columnWidths, tableWrapperWidthPx],
    );

    const layout = React.useMemo<ColumnLayout>(
        () => ({ ...columnWidths, ...columnPinning }),
        [columnWidths, columnPinning],
    );

    const visibleLeafKeys = React.useMemo(
        () => new Set(columnWidths.visibleLeaves.map((leaf) => leaf.key)),
        [columnWidths.visibleLeaves],
    );

    // Filters on columns that become hidden (constant, or gone after a layout switch) are dropped, not kept invisibly
    const [prevVisibleLeafKeys, setPrevVisibleLeafKeys] = React.useState(visibleLeafKeys);
    if (prevVisibleLeafKeys !== visibleLeafKeys) {
        setPrevVisibleLeafKeys(visibleLeafKeys);
        setTableFilterState((prev) => pruneHiddenColumnFilters(prev, visibleLeafKeys));
    }

    const sortScope = React.useMemo<SortScope | undefined>(() => {
        if (props.sortScopeColumnKey === undefined) return undefined;

        const resultLeafKeys = columnWidths.visibleLeaves
            .filter((leaf) => leaf.heading.columnType === ColumnType.RESULT)
            .map((leaf) => leaf.key);
        return { columnKey: props.sortScopeColumnKey, scopedColumnKeys: new Set(resultLeafKeys) };
    }, [props.sortScopeColumnKey, columnWidths.visibleLeaves]);

    const tableColumns = React.useMemo(() => {
        function renderColumnRecursive(
            heading: TableHeading,
            key: string,
        ): { node: React.ReactNode; widthPx: number } | null {
            if (heading.subHeading) {
                const children = Object.entries(heading.subHeading)
                    .map(([subKey, subHeading]) => renderColumnRecursive(subHeading, subKey))
                    .filter((child) => child !== null);
                if (children.length === 0) return null;

                const widthPx = children.reduce((sum, child) => sum + child.widthPx, 0);
                return {
                    widthPx,
                    node: (
                        <Table.Column key={key} colKey={key} width={widthPx}>
                            {heading.label}
                            {children.map((child) => child.node)}
                        </Table.Column>
                    ),
                };
            }

            const widthPx = layout.widthPxByKey.get(key);
            if (widthPx === undefined) return null;

            return {
                widthPx,
                node: (
                    // ! To make sorting logic easy, the col-keys should match the property key path in the data object
                    <Table.Column
                        key={key}
                        colKey={key}
                        width={widthPx}
                        stickyLeftPx={layout.stickyLeftPxByKey.get(key)}
                        stickyEdge={layout.lastPinnedKey === key}
                    >
                        {heading.label}
                    </Table.Column>
                ),
            };
        }

        return Object.entries(props.columnsConfig).map(([key, heading]) => renderColumnRecursive(heading, key)?.node);
    }, [props.columnsConfig, layout]);

    const collatedRows = React.useMemo(() => {
        const activeFilters = Object.entries(tableFilterState).filter(([, filterValue]) => filterValue);

        const filteredRows = props.rows.filter((row) => {
            return activeFilters.every(([columnKey, filterValue]) => {
                if (!filterValue) return true;

                const cellValue = row[columnKey];
                if (cellValue === null || cellValue === undefined) return false;

                return cellValue.toString().toLowerCase().includes(filterValue.toLowerCase());
            });
        });

        return applyTableSort(filteredRows, tableSortState, sortScope);
    }, [tableFilterState, props.rows, tableSortState, sortScope]);

    const hasExportableColumns = React.useMemo(
        () => collectLeafColumns(props.columnsConfig).length > 0,
        [props.columnsConfig],
    );
    const isDownloadDisabled = !props.onDownload || collatedRows.length === 0 || !hasExportableColumns;
    const hasActiveFilters = Object.values(tableFilterState).some((v) => v !== null && v !== "");
    const constantColumnsCaption = layout.constantColumns
        .map((column) => `${column.label}: ${column.displayValue}`)
        .join(" · ");

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="gap-x-3xs px-3xs py-3xs flex shrink-0 items-center justify-between">
                <div className="gap-x-3xs text-body-sm text-neutral-subtle flex items-center">
                    <span aria-live="polite">
                        {hasActiveFilters
                            ? `${collatedRows.length} of ${props.rows.length} rows`
                            : `${props.rows.length} rows`}
                    </span>
                    <Button
                        variant="ghost"
                        size="small"
                        disabled={!hasActiveFilters}
                        onClick={() => setTableFilterState({})}
                    >
                        Clear filters
                    </Button>
                </div>
                <Button
                    variant="outlined"
                    icon={<Download fontSize="inherit" />}
                    disabled={isDownloadDisabled}
                    onClick={() => props.onDownload?.(collatedRows)}
                >
                    Download CSV
                </Button>
            </div>
            {constantColumnsCaption && (
                <p className="px-3xs pb-3xs text-body-sm text-neutral-subtle shrink-0 break-words">
                    {constantColumnsCaption}
                </p>
            )}
            <div ref={tableWrapperRef} className="min-h-0 grow">
                <Table.Root
                    height="100%"
                    size="small"
                    fixed
                    sortable="multiple"
                    columnSorting={tableSortState}
                    onChangeColumnSort={setTableSortState}
                    compact
                >
                    <Table.Head sticky>
                        {tableColumns}
                        <TableFilterRow
                            filterState={tableFilterState}
                            layout={layout}
                            onFilterChange={(k, v) => setTableFilterState((prev) => ({ ...prev, [k]: v }))}
                        />
                    </Table.Head>

                    <Table.Body onPointerLeave={() => props.onHover(null)}>
                        <TableCompositions.VirtualizedRows rows={collatedRows}>
                            {(row) => (
                                <TableRowComp
                                    key={row.__id}
                                    row={row}
                                    layout={layout}
                                    formatDisplayValue={formatDisplayValue}
                                    onHover={props.onHover}
                                />
                            )}
                        </TableCompositions.VirtualizedRows>
                    </Table.Body>
                </Table.Root>
            </div>
        </div>
    );
}

function TableFilterRow(props: {
    filterState: { [columnKey: string]: string | null };
    layout: ColumnLayout;
    onFilterChange: (columnKey: string, filterValue: string | null) => void;
}) {
    return (
        <Table.Row sortable={false}>
            {props.layout.visibleLeaves.map(({ key, heading }) => {
                if (heading.columnType === ColumnType.RESULT) {
                    return <Table.Cell key={key} colKey={key} noPadding />;
                }

                return (
                    <TableFilterCell
                        key={key}
                        filterValue={props.filterState[key] ?? null}
                        colKey={key}
                        heading={heading}
                        onFilterChange={props.onFilterChange}
                    />
                );
            })}
        </Table.Row>
    );
}

function TableFilterCell(props: {
    colKey: string;
    heading: TableHeading;
    filterValue: string | null;
    onFilterChange: (columnKey: string, filterValue: string | null) => void;
}) {
    function handleFilterChange(newValue: string | null) {
        props.onFilterChange(props.colKey, newValue);
    }

    const [localTableFilterState, debouncedHandleFilterChange] = useDebouncedOnChange(
        props.filterValue,
        handleFilterChange,
        FILTER_DEBOUNCE_TIME_MS,
    );

    // TODO: Different filter types based on column type
    // let filterInput: React.ReactNode;

    // if (props.heading.columnType === ColumnType.RESULT) {
    //     const minValue = minBy(props.rows, props.colKey)?.[props.colKey] ?? 0
    //     const maxValue = maxBy(props.rows, props.colKey)?.[props.colKey] ?? 0

    //     // TODO: Implement min/max range filter for result columns
    //     filterInput =
    //     (
    //         <>
    //             <NumberInput
    //                 value={}
    //             />
    //         </>
    //     )
    //     null; // <MinMaxRangeFilter min={...} max={...} onChange={...} />
    // } else if (props.heading.columnType === ColumnType.ENSEMBLE) {
    //     // TODO: Implement multi-select dropdown for ensemble columns
    //     filterInput = null; // <EnsembleMultiSelect ensembles={...} selected={...} onChange={...} />
    // } else if (props.heading.columnType === ColumnType.FLUID) {
    //     // TODO: Implement multi-select dropdown for fluid columns
    //     filterInput = null; // <FluidMultiSelect fluids={...} selected={...} onChange={...} />
    // } else {
    //     // Default text filter for other column types (INDEX, etc.)
    //     filterInput = (
    // <TextInput
    //     value={localTableFilterState ?? ""}
    //     layoutClassName="font-light bg-surface"
    //     placeholder="Filter values..."
    //     onValueChange={debouncedHandleFilterChange}
    //     endAdornment={
    //         <Button
    //             layoutClassName="my-4xs -mr-4xs"
    //             iconOnly
    //             variant="ghost"
    //             onClick={() => debouncedHandleFilterChange(null)}
    //         >
    //             <Close />
    //         </Button>
    //     }
    // />
    //     );
    // }

    return (
        <Table.Cell colKey={props.colKey} noPadding>
            <TextInput
                aria-label={`Filter ${props.heading.label}`}
                value={localTableFilterState ?? ""}
                layoutClassName="font-light bg-surface"
                placeholder="Filter values..."
                onValueChange={debouncedHandleFilterChange}
                endAdornment={
                    <Button
                        layoutClassName="my-4xs -mr-4xs"
                        iconOnly
                        variant="ghost"
                        onClick={() => debouncedHandleFilterChange(null)}
                    >
                        <Clear />
                    </Button>
                }
            />
        </Table.Cell>
    );
}

function TableRowComp(props: {
    row: TableRow<TableColumnsConfig>;
    layout: ColumnLayout;
    formatDisplayValue: (value: string | number | null, heading: TableHeading) => string;
    onHover: (row: TableRow<TableColumnsConfig>) => void;
}) {
    return (
        // The row is "selectable" just so we get the hover effect. The root does never applies the selection
        <Table.Row selectable rowKey={props.row.__id} onPointerOver={() => props.onHover(props.row)}>
            {props.layout.visibleLeaves.map(({ key, heading }) => {
                const value = props.row[key] ?? null;
                const isWidthCapped = props.layout.widthPxByKey.get(key) === CATEGORY_COLUMN_MAX_WIDTH_PX;
                const displayValue =
                    heading.columnType === ColumnType.RESULT ? "" : props.formatDisplayValue(value, heading);

                return (
                    <TableCellComp
                        key={key}
                        value={value}
                        displayValue={displayValue}
                        columnType={heading.columnType}
                        title={isWidthCapped ? displayValue : undefined}
                    />
                );
            })}
        </Table.Row>
    );
}

function TableCellComp(props: {
    value: string | number | null;
    displayValue: string;
    columnType?: ColumnType;
    title?: string;
}) {
    if (props.columnType === ColumnType.FLUID) {
        const fluidType = props.value?.toString().toLocaleLowerCase() ?? "";

        return (
            <Table.Cell title={props.title}>
                <span style={{ color: isValidFluidType(fluidType) ? PHASE_COLORS[fluidType] : undefined }}>
                    {props.displayValue}
                </span>
            </Table.Cell>
        );
    }

    if (props.columnType === ColumnType.RESULT) {
        return (
            <Table.Cell title={props.title} layoutClassName="text-right">
                {formatInplaceVolumesValue(props.value)}
            </Table.Cell>
        );
    }

    return <Table.Cell title={props.title}>{props.displayValue}</Table.Cell>;
}
