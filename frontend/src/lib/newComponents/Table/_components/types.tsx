import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

// ! The table cell props need to be here to avoid circular dependencies
export type TableCellProps = {
    colKey?: string;
    children?: React.ReactNode;

    sortable?: boolean;

    // Don't understand why, but these don't get included by the native type, for some reason...
    colSpan?: number;
    rowSpan?: number;
    noPadding?: boolean;
    widthInPercent?: number;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableCellElement>>;
