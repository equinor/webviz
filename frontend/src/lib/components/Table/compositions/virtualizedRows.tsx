import type React from "react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { Virtualization } from "@lib/components/Virtualization";

import type { TableRowProps } from "../_components/row";
import { useTableRootContext } from "../_contexts/tableRootContext";

export type VirtualizedRowsProps<TValue> = {
    rows: TValue[];
    rowHeight?: number;
    children: (row: TValue, index: number) => React.ReactElement<TableRowProps>;
};

export function VirtualizedRows<TValue>(props: VirtualizedRowsProps<TValue>): React.ReactNode {
    const rootContext = useTableRootContext();
    const componentSize = useComponentSize();

    const rowHeight = props.rowHeight ?? { small: 29, default: 33, large: 37 }[componentSize];

    return (
        <Virtualization
            containerRef={rootContext.overflowWrapperRef}
            placeholderComponent="tr"
            items={props.rows}
            itemSize={rowHeight}
            direction={"vertical"}
            renderItem={(value, index) => props.children(value, index)}
        />
    );
}
