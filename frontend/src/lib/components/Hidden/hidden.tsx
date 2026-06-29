import type React from "react";

export type HiddenProps = {
    /** The content to show or hide. */
    children: React.ReactNode;
    /** When true, the children are hidden from view. @default false */
    hidden?: boolean;
    /** When true, children remain mounted in the DOM even when hidden, preserving their state. @default false */
    keepMounted?: boolean;
};

export function Hidden(props: HiddenProps) {
    if (props.keepMounted) {
        // Always display:contents so children stay in the parent subgrid — label lands in col 1,
        // input in col 2 — keeping column widths stable whether hidden or shown.
        // data-hidden lets children hide themselves via in-data-hidden:* without leaving the grid.
        return (
            <div className="contents" {...(props.hidden ? { "data-hidden": "" } : {})}>
                {props.children}
            </div>
        );
    }

    if (props.hidden) {
        return null;
    }

    return <>{props.children}</>;
}
