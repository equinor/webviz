import React from "react";

import { random } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ROW_HEIGHT_PX } from "./constants";
import type { ColumnDefMap, DataCellDef, TableRowWithKey } from "./types";
import { isLoadedDataRow } from "./utils";

export type TableRowProps<T extends ColumnDefMap> = {
    rowData: TableRowWithKey<T>;
    selected: boolean;
    dataCellDefinitions: DataCellDef[];
    onClick: (row: TableRowWithKey<T>, evt: React.MouseEvent) => void;
    onMouseOver: (row: TableRowWithKey<T>, evt: React.MouseEvent<HTMLTableRowElement>) => void;
};

export function TableRow<T extends ColumnDefMap>(props: TableRowProps<T>): React.ReactNode {
    const isLoaded = isLoadedDataRow(props.rowData);

    // Randomizing where in the pulsing animation we start. Wrapped in memo so it stays between rerenders
    const animationDelay = React.useMemo(() => `${random(-1, 0, true)}s`, []);

    return (
        <tr
            className={resolveClassNames("group/tr border-b-2 last:border-b-0", {
                "hover:bg-blue-100": !props.selected && isLoaded,
                "bg-blue-300 text-white hover:bg-blue-200": props.selected && isLoaded,
            })}
            onClick={(evt) => isLoaded && props.onClick(props.rowData, evt)}
            onMouseOver={(evt) => isLoaded && props.onMouseOver?.(props.rowData, evt)}
        >
            {props.dataCellDefinitions.map((cellDef) => {
                if (props.rowData._pending)
                    return (
                        <td
                            key={cellDef.columnId}
                            className=" border-slate-200 p-2 whitespace-nowrap truncate"
                            title="Data is pending..."
                            style={{ height: ROW_HEIGHT_PX }}
                        >
                            <div
                                className="rounded-4xl bg-slate-300/50 h-full w-full animate-pulse transition-opacity"
                                style={{ animationDelay }}
                            />
                        </td>
                    );

                const dataValue = props.rowData[cellDef.columnId];
                const style = cellDef.style?.(dataValue, props.rowData);
                const formattedData = cellDef?.format?.(dataValue, props.rowData);

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
