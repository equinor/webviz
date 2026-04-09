import React from "react";

import { random } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { LoadedDataWithKey, TableCellDefinitions, TableDataWithKey } from "../types";
import { isLoadedDataRow } from "../utils";

export type TableRowProps<T extends Record<string, any>> = {
    row: TableDataWithKey<T>;
    height: number;
    selected: boolean;
    selectionEnabled: boolean | undefined;
    dataCellDefinitions: TableCellDefinitions<T>["dataCells"];
    onClick: (entry: LoadedDataWithKey<T>, evt: React.MouseEvent) => void;
    onMouseOver: (entry: LoadedDataWithKey<T>, evt: React.MouseEvent) => void;
};

export function TableRow<T extends Record<string, any>>(props: TableRowProps<T>): React.ReactNode {
    const { row } = props; // Extracted so narrowing below works correctly
    const isLoaded = isLoadedDataRow<T>(row);

    // Randomizing where in the pulsing animation we start. Wrapped in memo so it stays between rerenders
    const animationDelay = React.useMemo(() => `${random(-1, 0, true)}s`, []);

    const handleMouseDown = React.useCallback(
        function handleMouseDown(evt: React.MouseEvent) {
            if (!props.selectionEnabled) return;

            // Default behavior will select cells/text, which is undesirable
            if (evt.shiftKey || evt.ctrlKey) {
                evt.preventDefault();
            }
        },
        [props.selectionEnabled],
    );

    return (
        <tr
            className={resolveClassNames("group/tr border-b last:border-b-0", {
                "hover:bg-accent": !props.selected && isLoaded,
                "bg-accent-strong hover:bg-accent-strong-hover text-accent-strong-on-emphasis":
                    props.selected && isLoaded,
            })}
            onMouseDown={handleMouseDown}
            onClick={(evt) => isLoaded && props.onClick(row, evt)}
            onMouseOver={(evt) => isLoaded && props.onMouseOver?.(row, evt)}
        >
            {props.dataCellDefinitions.map((cellDef) => {
                if (!isLoaded)
                    return (
                        <td
                            key={String(cellDef.columnId)}
                            className="border-neutral-subtle truncate p-2 whitespace-nowrap"
                            title="Data is pending..."
                            style={{ height: props.height }}
                        >
                            <div
                                className="h-full w-full animate-pulse rounded-4xl bg-slate-300/50 transition-opacity"
                                style={{ animationDelay }}
                            />
                        </td>
                    );

                const dataValue = row[cellDef.columnId];
                const style = cellDef.style?.(dataValue, { entry: row, selected: props.selected });
                const formattedData = cellDef?.format?.(dataValue, { entry: row, selected: props.selected });

                const cellData = formattedData ?? dataValue;

                return (
                    <td
                        key={String(cellDef.columnId)}
                        className="border-neutral-subtle p-vertical-xs truncate border whitespace-nowrap"
                        title={cellDef.showTooltip ? cellData : undefined}
                        style={{ height: props.height, ...style }}
                    >
                        {cellDef.render?.(dataValue, { entry: row, selected: props.selected }) ?? cellData}
                    </td>
                );
            })}
        </tr>
    );
}
