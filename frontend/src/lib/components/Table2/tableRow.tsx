import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ROW_HEIGHT_PX } from "./constants";
import type { ColumnDefMap, DataCellDef, TableRowWithKey } from "./types";

export type TableRowProps<T extends ColumnDefMap> = {
    rowData: TableRowWithKey<T>;
    selected: boolean;
    dataCellDefinitions: DataCellDef[];
    onClick: (row: TableRowWithKey<T>, evt: React.MouseEvent) => void;
    onMouseOver: (row: TableRowWithKey<T>, evt: React.MouseEvent<HTMLTableRowElement>) => void;
};

export function TableRow<T extends ColumnDefMap>(props: TableRowProps<T>): React.ReactNode {
    return (
        <tr
            className={resolveClassNames("group/tr", {
                "hover:bg-blue-100": !props.selected,
                "bg-blue-300 text-white hover:bg-blue-200": props.selected,
            })}
            style={{ height: ROW_HEIGHT_PX }}
            onClick={(evt) => props.onClick(props.rowData, evt)}
            onMouseOver={(evt) => props.onMouseOver?.(props.rowData, evt)}
        >
            {props.dataCellDefinitions.map((cellDef) => {
                const dataValue = props.rowData[cellDef.columnId];

                return (
                    <td key={cellDef.columnId} className="border-b-2 border-slate-200 p-1 whitespace-nowrap">
                        {cellDef?.format?.(dataValue, props.rowData) ?? dataValue}
                    </td>
                );
            })}
        </tr>
    );
}
