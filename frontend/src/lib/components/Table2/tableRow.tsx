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
            className={resolveClassNames("group/tr border-b-2 last:border-b-0", {
                "hover:bg-blue-100": !props.selected,
                "bg-blue-300 text-white hover:bg-blue-200": props.selected,
            })}
            onClick={(evt) => props.onClick(props.rowData, evt)}
            onMouseOver={(evt) => props.onMouseOver?.(props.rowData, evt)}
        >
            {props.dataCellDefinitions.map((cellDef) => {
                const dataValue = props.rowData[cellDef.columnId];
                const style = cellDef.style?.(dataValue, props.rowData);
                const formattedData = cellDef?.format?.(dataValue, props.rowData);

                if (cellDef.render) {
                    return cellDef.render(dataValue, props.rowData);
                }

                return (
                    <td
                        key={cellDef.columnId}
                        className=" border-slate-200 p-1 whitespace-nowrap truncate"
                        title={formattedData}
                        style={{ height: ROW_HEIGHT_PX, ...style }}
                    >
                        {cellDef.render?.(dataValue, props.rowData) ?? formattedData ?? dataValue}
                    </td>
                );
            })}
        </tr>
    );
}
