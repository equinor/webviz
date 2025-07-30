import React from "react";

import { orderBy } from "lodash";
import { v4 } from "uuid";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Virtualization } from "../Virtualization";

import { ALTERNATING_COLUMN_CELL_COLORS, ROW_HEIGHT_PX } from "./constants";
import { TableHead } from "./tableHead";
import { TableRow } from "./tableRow";
import type {
    ColumnDefMap,
    TableRowData,
    ColGroupDef,
    TableCellDefinitions,
    ColumnSortSetting,
    SortDirection,
} from "./types";
import { recursivelyBuildTableCellDefinitions, recursivelyBuildTableColumnGroups } from "./utils";

export type TableProps<T extends ColumnDefMap> = {
    columnDefMap: T;
    rows: TableRowData<T>[];

    height?: number | string;
    // numVisibleRows?: number;

    sortedColumn?: keyof T;
    sortingDirection?: SortDirection;

    alternatingColumnColors?: boolean;

    /* Assumes "id" */
    rowIdentifier?: string | false;
};

export function Table<T extends ColumnDefMap>(props: TableProps<T>): React.ReactNode {
    const divWrapperRef = React.useRef<HTMLDivElement>(null);

    const tableCellDefinitions = React.useMemo(() => {
        return recursivelyBuildTableCellDefinitions(props.columnDefMap);
    }, [props.columnDefMap]);

    const colgroupDefinitions = React.useMemo(() => {
        return recursivelyBuildTableColumnGroups(props.columnDefMap);
    }, [props.columnDefMap]);

    const [colSortSettings, setColSortSettings] = React.useState<ColumnSortSetting[]>([]);
    // const [colFilterSettings, setColFilterSettings] = React.useState<

    // TODO: Allow external collation control
    // TODO: Cannot deselect a clicked header
    const collationIsControlled = false;

    const sortedRows = React.useMemo(() => {
        if (collationIsControlled) return props.rows;

        // Apply filtering
        const fieldIterateeSetting = [];
        const dirIterateeSetting = [];

        for (const setting of colSortSettings) {
            fieldIterateeSetting.push(setting.columnId);
            dirIterateeSetting.push(setting.direction);
        }

        return orderBy(props.rows, fieldIterateeSetting, dirIterateeSetting);
    }, [colSortSettings, collationIsControlled, props.rows]);

    // Uncontrolled unless specified externally
    // const [sortedColumn, setSortedColumn] = useOptInControlledValue<string | null>(null, props.sortedColumn);
    // TODO: Replace with opt-in controlled value
    // const [sortedColumn, setSortedColumn] = React.useState<string | null>(null);
    // const [sortDirection, setSortDirectionLocal] = React.useState<SortDirection | null>(null);

    // const sortedColumn = collationIsUncontrolled ?

    // function handleHeaderSortClick(columnId: string, direction: SortDirection): void {
    //     if (sortedColumn === columnId && sortDirection === direction) {
    //         setSortedColumn(null);
    //         setSortDirectionLocal(null);
    //     } else {
    //         setSortedColumn(columnId);
    //         setSortDirectionLocal(direction);
    //     }
    // }

    return (
        <div ref={divWrapperRef} className="relative overflow-auto" style={{ height: props.height }}>
            <table className="w-full border-x border-slate-500 text-sm">
                {/* Create col-groups based on the top-level columns */}
                <TableColGroups
                    colgroupDefinitions={colgroupDefinitions}
                    alternatingColumnColors={props.alternatingColumnColors}
                />

                <TableHead
                    wrapperElement={divWrapperRef}
                    headerCellDefinitions={tableCellDefinitions.headerCells}
                    filterCellDefinitions={tableCellDefinitions.filterCells}
                    alternatingColumnColors={!!props.alternatingColumnColors}
                    columnSortSettings={colSortSettings}
                    onColumnSortingChange={setColSortSettings}
                />

                <TableBody
                    wrapperElement={divWrapperRef}
                    dataCellDefinitions={tableCellDefinitions.dataCells}
                    rows={sortedRows}
                    height={props.height}
                    // numVisibleRows={props.numVisibleRows}
                />
            </table>
        </div>
    );
}

type TableColGroupsProps = {
    colgroupDefinitions: ColGroupDef[];
    alternatingColumnColors: boolean | undefined;
};

function TableColGroups(props: TableColGroupsProps): React.ReactNode {
    return (
        <>
            {props.colgroupDefinitions.map((colGroupDef, index) => {
                const colorIndex = props.alternatingColumnColors ? index % 2 : 1;
                const headerColorClass = ALTERNATING_COLUMN_CELL_COLORS[colorIndex];
                const borderColor = props.alternatingColumnColors ? "border-slate-400" : "border-gray-200";

                return (
                    <colgroup
                        key={colGroupDef.columnId}
                        className={resolveClassNames(headerColorClass, "border-x-2", borderColor)}
                    >
                        {colGroupDef.cols.map((colDef) => (
                            <col
                                key={colDef.columnId}
                                className="border-x-2 first:border-l-0 last:border-r-0"
                                style={{ width: `${colDef.width}%` }}
                            />
                        ))}
                    </colgroup>
                );
            })}
        </>
    );
}

type TableBodyProps<T extends ColumnDefMap> = {
    wrapperElement: React.RefObject<HTMLElement>;
    height?: number | string;
    // numVisibleRows?: number;
    dataCellDefinitions: TableCellDefinitions["dataCells"];
    rows: TableRowData<T>[];
};

function TableBody<T extends ColumnDefMap>(props: TableBodyProps<T>): React.ReactNode {
    const rowsWithKey = React.useMemo(() => props.rows.map((r) => ({ ...r, _key: v4() })), [props.rows]);

    return (
        <tbody>
            <Virtualization
                containerRef={props.wrapperElement}
                direction="vertical"
                placeholderComponent="tr"
                items={rowsWithKey}
                itemSize={ROW_HEIGHT_PX}
                renderItem={(row) => (
                    <TableRow key={row._key} rowData={row} dataCellDefinitions={props.dataCellDefinitions} />
                )}
            />

            {rowsWithKey.length === 0 && (
                <tr style={{ height: ROW_HEIGHT_PX * 2.5 }}>
                    <td
                        className="text-lg italic text-slate-600 text-center align-middle border-x-0 border-b-2 border-slate-200"
                        colSpan={props.dataCellDefinitions.length}
                    >
                        No data found
                    </td>
                </tr>
            )}
        </tbody>
    );
}
