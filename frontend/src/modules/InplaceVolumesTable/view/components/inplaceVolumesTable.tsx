import React from "react";

import { Clear } from "@mui/icons-material";
import { orderBy } from "lodash";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { Button } from "@lib/newComponents/Button";
import { Table } from "@lib/newComponents/Table";
import { TableCompositions } from "@lib/newComponents/Table/compositions";
import type { TableSortState } from "@lib/newComponents/Table/typesAndEnums";
import { TextInput } from "@lib/newComponents/TextInput";
import { PHASE_COLORS } from "@modules/_shared/constants/colors";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";

import type { TableColumnsConfig, TableHeading, TableRow } from "../types";
import { formatEnsembleIdent, formatResultValue, isValidFluidType } from "../utils/tableComponentUtils";

export type InplaceVolumesTableProps = {
    ensembleSet: EnsembleSet;
    columnsConfig: TableColumnsConfig;
    rows: TableRow<TableColumnsConfig>[];

    onHover: (row: TableRow<TableColumnsConfig> | null) => void;
};

const FILTER_DEBOUNCE_TIME_MS = 250;

export function InplaceVolumesTable(props: InplaceVolumesTableProps): React.ReactNode {
    const [tableSortState, setTableSortState] = React.useState<TableSortState[]>([]);
    const [tableFilterState, setTableFilterState] = React.useState<{ [columnKey: string]: string | null }>({});

    const tableColumns = React.useMemo(() => {
        function renderColumnRecursive(heading: TableHeading, key: string): React.ReactNode {
            return (
                <Table.Column key={key} colKey={key} widthInPercent={heading.sizeInPercent}>
                    {heading.label}
                    {heading.subHeading &&
                        Object.entries(heading.subHeading).map(([subKey, subHeading]) =>
                            renderColumnRecursive(subHeading, `${key}.${subKey}`),
                        )}
                </Table.Column>
            );
        }

        return Object.entries(props.columnsConfig).map(([key, heading]) => renderColumnRecursive(heading, key));
    }, [props.columnsConfig]);

    const collatedRows = React.useMemo(() => {
        const filteredRows = props.rows.filter((row) => {
            return Object.entries(tableFilterState).every(([columnKey, filterValue]) => {
                if (!filterValue) return true;

                const cellValue = row[columnKey];
                if (cellValue === null || cellValue === undefined) return false;

                return cellValue.toString().toLowerCase().includes(filterValue.toLowerCase());
            });
        });

        return orderBy(
            filteredRows,
            tableSortState.map((s) => s.columnKey),
            tableSortState.map((s) => s.direction as "asc" | "desc"),
        );
    }, [tableFilterState, props.rows, tableSortState]);

    return (
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
                    columnConfig={props.columnsConfig}
                    onFilterChange={(k, v) => setTableFilterState((prev) => ({ ...prev, [k]: v }))}
                />
            </Table.Head>

            <Table.Body onPointerLeave={() => props.onHover(null)}>
                <TableCompositions.VirtualizedRows rows={collatedRows}>
                    {(row) => (
                        <TableRowComp
                            key={row.__id}
                            row={row}
                            tableColumnConfig={props.columnsConfig}
                            ensembleSet={props.ensembleSet}
                            onHover={props.onHover}
                        />
                    )}
                </TableCompositions.VirtualizedRows>
            </Table.Body>
        </Table.Root>
    );
}

function TableFilterRow(props: {
    filterState: { [columnKey: string]: string | null };
    columnConfig: TableColumnsConfig;
    onFilterChange: (columnKey: string, filterValue: string | null) => void;
}) {
    return (
        <Table.Row sortable={false}>
            {Object.entries(props.columnConfig).map(([colKey, heading]) => (
                <TableFilterCell
                    key={colKey}
                    filterValue={props.filterState[colKey] ?? null}
                    colKey={colKey}
                    heading={heading}
                    onFilterChange={props.onFilterChange}
                />
            ))}
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
    tableColumnConfig: TableColumnsConfig;
    ensembleSet: EnsembleSet;
    onHover: (row: TableRow<TableColumnsConfig>) => void;
}) {
    const columnConfigLookUp = React.useMemo(() => {
        const lookUp: { [key: string]: TableHeading } = {};

        function addToLookUpRecursive(heading: TableHeading, key: string) {
            lookUp[key] = heading;
            if (heading.subHeading) {
                Object.entries(heading.subHeading).forEach(([subKey, subHeading]) =>
                    addToLookUpRecursive(subHeading, `${subKey}`),
                );
            }
        }

        Object.entries(props.tableColumnConfig).forEach(([key, heading]) => addToLookUpRecursive(heading, key));

        return lookUp;
    }, [props.tableColumnConfig]);

    return (
        // The row is "selectable" just so we get the hover effect. The root does never applies the selection
        <Table.Row selectable rowKey={props.row.__id} onPointerOver={() => props.onHover(props.row)}>
            {Object.entries(props.row).map(([colKey, v]) => {
                if (colKey === "__id") return null;
                return (
                    <TableCellComp
                        key={colKey}
                        value={v}
                        columnType={columnConfigLookUp[colKey]?.columnType}
                        ensembleSet={props.ensembleSet}
                    />
                );
            })}
        </Table.Row>
    );
}

function TableCellComp(props: { value: string | number | null; columnType?: ColumnType; ensembleSet: EnsembleSet }) {
    if (props.columnType === ColumnType.FLUID) {
        const fluidType = props.value?.toString().toLocaleLowerCase() ?? "";

        return (
            <Table.Cell>
                <span style={{ color: isValidFluidType(fluidType) ? PHASE_COLORS[fluidType] : undefined }}>
                    {props.value}
                </span>
            </Table.Cell>
        );
    }

    if (props.columnType === ColumnType.RESULT) {
        return <Table.Cell layoutClassName="text-right">{formatResultValue(props.value)}</Table.Cell>;
    }

    if (props.columnType === ColumnType.ENSEMBLE) {
        return <Table.Cell>{formatEnsembleIdent(props.value, props.ensembleSet)}</Table.Cell>;
    }

    return <Table.Cell>{props.value}</Table.Cell>;
}
