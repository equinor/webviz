import React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";

import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { useTableRootContext } from "../_contexts/tableRootContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

import { Cell } from "./cell";
import { Row } from "./row";

export type TableBodyProps = {
    /** Message shown when the table has no data rows. Set to `false` to disable. @default "No data found" */
    emptyMessage?: string | false;
    /** The table rows. */
    children?: React.ReactNode;
} & ComponentWrapperProps<React.HTMLAttributes<HTMLTableSectionElement>>;

const DEFAULT_PROPS = {
    emptyMessage: "No data found",
} satisfies Partial<TableBodyProps>;

export const Body = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(function Body(props, ref): React.ReactNode {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(defaultedProps, "emptyMessage");
    const rootContext = useTableRootContext();

    return (
        <tbody {...baseProps} ref={ref} tabIndex={rootContext.selectable ? 0 : undefined}>
            <TableSectionContext.Provider value="body">{defaultedProps.children}</TableSectionContext.Provider>
            <NoDataRow message={defaultedProps.emptyMessage} />
        </tbody>
    );
});

function NoDataRow(props: { message: string | false }) {
    const columnContext = useTableColumnContext();
    const size = useComponentSize();
    const textSize = getTextSizeForSelectableSize(size);

    if (props.message === false || props.message === "") return null;

    return (
        <Row layoutClassName="not-only:hidden" selectable={false}>
            <Cell colSpan={columnContext.leafCount}>
                <Typography italic layoutClassName="opacity-50" size={getNextTextSize(textSize, 1)}>
                    {props.message}
                </Typography>
            </Cell>
        </Row>
    );
}

