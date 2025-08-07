import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ALTERNATING_COLUMN_CELL_COLORS } from "../constants";
import type { ColGroupDef } from "../types";

type TableColGroupsProps = {
    colgroupDefinitions: ColGroupDef[];
    alternatingColumnColors: boolean | undefined;
};
export function TableColGroups(props: TableColGroupsProps): React.ReactNode {
    return (
        <>
            {props.colgroupDefinitions.map((colGroupDef, index) => {
                const colorIndex = props.alternatingColumnColors ? index % 2 : 1;
                const headerColorClass = ALTERNATING_COLUMN_CELL_COLORS[colorIndex];

                return (
                    <colgroup
                        key={colGroupDef.columnId}
                        className={resolveClassNames(headerColorClass, "border-x-2 border-gray-200")}
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
