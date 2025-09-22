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
            <div className={resolveClassNames("flex flex-col relative")}>
                <Header {...props} />
                <div className={resolveClassNames("bg-white border-b shadow-sm")}>{props.children}</div>
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
                "w-full flex gap-1 h-8 bg-slate-100 text-sm items-center border-b border-b-gray-300 px-2",
                props.headerClassNames ?? "",
            )}
        >
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <div className="flex items-center gap-2 grow min-w-0">
                {props.startAdornment}
                <div className="grow min-w-0">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
