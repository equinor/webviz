import React from "react";

import { random } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ROW_HEIGHT_PX } from "../constants";
import type { LoadedDataWithKey, TableCellDefinitions, TableDataWithKey } from "../types";
import { isLoadedDataRow } from "../utils";

export type TableRowProps<T extends Record<string, any>> = {
    row: TableDataWithKey<T>;
    selected: boolean;
    dataCellDefinitions: TableCellDefinitions<T>["dataCells"];
    onClick: (entry: LoadedDataWithKey<T>, evt: React.MouseEvent) => void;
    onMouseOver: (entry: LoadedDataWithKey<T>, evt: React.MouseEvent<HTMLTableRowElement>) => void;
};

export function TableRow<T extends Record<string, any>>(props: TableRowProps<T>): React.ReactNode {
    const { row } = props; // Extracted so narrowing below works correctly
    const isLoaded = isLoadedDataRow<T>(row);

    // Randomizing where in the pulsing animation we start. Wrapped in memo so it stays between rerenders
    const animationDelay = React.useMemo(() => `${random(-1, 0, true)}s`, []);

    return (
        <tr
            className={resolveClassNames("group/tr border-b-2 last:border-b-0 select-none", {
                "hover:bg-blue-100": !props.selected && isLoaded,
                "bg-blue-300 text-white hover:bg-blue-200": props.selected && isLoaded,
            })}
            onClick={(evt) => isLoaded && props.onClick(row, evt)}
            onMouseOver={(evt) => isLoaded && props.onMouseOver?.(row, evt)}
        >
            {props.dataCellDefinitions.map((cellDef) => {
                if (!isLoaded)
                    return (
                        <td
                            key={String(cellDef.columnId)}
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

                const dataValue = row[cellDef.columnId];
                const style = cellDef.style?.(dataValue, row);
                const formattedData = cellDef?.format?.(dataValue, row);

                return (
                    <td
                        key={String(cellDef.columnId)}
                        className=" border-slate-200 p-1 whitespace-nowrap truncate"
                        title={formattedData}
                        style={{ maxHeight: ROW_HEIGHT_PX, ...style }}
                    >
                        {cellDef.render?.(dataValue, row) ?? formattedData ?? dataValue}
                    </td>
                );
            })}
        </tr>
    );
}
