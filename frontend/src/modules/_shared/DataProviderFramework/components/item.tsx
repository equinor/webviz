import type React from "react";

import { DragIndicator } from "@mui/icons-material";

import { SortableList } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SortableListItemProps = {
    id: string;
    title: React.ReactNode;
    headerClassNames?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    children?: React.ReactNode;
};

/**
 *
 * @param {SortableListItemProps} props Object of properties for the SortableListItem component (see below for details).
 * @param {string} props.id ID that is unique among all components inside the sortable list.
 * @param {React.ReactNode} props.title Title component of the list item.
 * @param {React.ReactNode} props.startAdornment Start adornment to display to the left of the title.
 * @param {React.ReactNode} props.endAdornment End adornment to display to the right of the title.
 * @param {React.ReactNode} props.children Child components to display as the content of the list item.
 *
 * @returns {React.ReactNode} A sortable list item component.
 */
export function SortableListItem(props: SortableListItemProps): React.ReactNode {
    return (
        <SortableList.Item id={props.id}>
            <div className={resolveClassNames("relative flex flex-col")}>
                <Header {...props} />
                <div
                    className={resolveClassNames("border-b-neutral-subtle bg-surface shadow-elevation-raised border-b")}
                >
                    {props.children}
                </div>
            </div>
        </SortableList.Item>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerClassNames?: string;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "gap-x-3xs bg-neutral-canvas border-b-neutral-subtle text-body-sm px-3xs flex h-8 w-full items-center border-b",
                props.headerClassNames ?? "",
            )}
        >
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <div className="gap-x-3xs flex min-w-0 grow items-center">
                {props.startAdornment}
                <div className="min-w-0 grow">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
