import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

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

    /** Pins the cell to the left edge of the scroll container at this offset (px). */
    stickyLeftPx?: number;
    /** Draws a right border to mark the last pinned column. */
    stickyEdge?: boolean;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableCellElement>>;
