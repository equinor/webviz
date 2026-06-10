import React from "react";

import { random, range } from "lodash";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";

import { Table } from "..";
import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { useTableRootContext } from "../_contexts/tableRootContext";
import { ROW_HEIGHT_PX, ROW_HEIGHT_PX_COMPACT } from "../constants";

export type PendingRowsProps = {
    rowCount: number | "fill";
    containerRef?: React.RefObject<HTMLElement>;
};

export function PendingRows(props: PendingRowsProps): React.ReactNode {
    const rootContext = useTableRootContext();
    const componentSize = useComponentSize();

    const rowHeight = rootContext.compact ? ROW_HEIGHT_PX_COMPACT[componentSize] : ROW_HEIGHT_PX[componentSize];

    const rowCount = React.useMemo(() => {
        if (typeof props.rowCount === "number") {
            return props.rowCount;
        }

        if (rootContext.availableBodyHeight <= 0) return 0;

        return Math.floor(rootContext.availableBodyHeight / rowHeight);
    }, [props.rowCount, rootContext.availableBodyHeight, rowHeight]);

    return (
        <>
            {range(rowCount).map((i) => (
                <PendingRow key={i} />
            ))}
        </>
    );
}

export function PendingRow(): React.ReactNode {
    const tableColumnContext = useTableColumnContext();

    return (
        <Table.Row layoutClassName="--pending-row" title="Data is pending..." selectable={false}>
            {range(tableColumnContext.leafCount).map((i) => (
                <PendingCell key={i} />
            ))}
        </Table.Row>
    );
}

function PendingCell(): React.ReactNode {
    const animationDelay = React.useMemo(() => `${random(-1, 0, true)}s`, []);

    return (
        <Table.Cell noPadding layoutClassName="h-full px-4xs py-2xs">
            <div
                className="bg-hover bg-neutral/50 block h-full w-full animate-pulse rounded-4xl transition-opacity duration-4000"
                style={{ animationDelay }}
            />
        </Table.Cell>
    );
}
