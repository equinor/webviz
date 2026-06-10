import type React from "react";

import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";

import { SortableList } from "@lib/newComponents/SortableList";
import { Button } from "@lib/newComponents/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SortableListGroupProps = {
    id: string;
    title: React.ReactNode;
    expanded: boolean;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerStyle?: React.CSSProperties;
    content?: React.ReactNode;
    contentStyle?: React.CSSProperties;
    contentWhenEmpty?: React.ReactNode;
    children?: React.ReactElement[];
    onToggleExpanded: (expanded: boolean) => void;
};

/**
 *
 * @param {SortableListGroupProps} props Object of properties for the SortableListGroup component (see below for details).
 * @param {string} props.id ID that is unique among all components inside the sortable list.
 * @param {React.ReactNode} props.title Title of the list item.
 * @param {boolean} props.expanded Whether the group should be expanded.
 * @param {React.ReactNode} props.startAdornment Start adornment to display to the left of the title.
 * @param {React.ReactNode} props.endAdornment End adornment to display to the right of the title.
 * @param {React.ReactNode} props.content Optional content to display before actual children.
 * @param {React.ReactNode} props.contentWhenEmpty Content to display when the group is empty.
 * @param {React.ReactNode} props.children Child components to display as the content of the list item.
 *
 * @returns {React.ReactNode} A sortable list group component.
 */
export function SortableListGroup(props: SortableListGroupProps): React.ReactNode {
    function handleToggleExpanded() {
        props.onToggleExpanded(!props.expanded);
    }

    const hasContent = props.children !== undefined && props.children.length > 0;

    return (
        <SortableList.Group id={props.id}>
            <div className="bg-canvas">
                <Header {...props} onToggleExpanded={handleToggleExpanded} expanded={props.expanded} hovered={false} />
                <SortableList.GroupContent>
                    <div
                        className={resolveClassNames("pl-3xs border-b-neutral-subtle bg-surface border-b", {
                            hidden: !props.expanded,
                        })}
                        style={props.contentStyle}
                    >
                        {props.content}
                        {hasContent ? props.children : props.contentWhenEmpty}
                    </div>
                </SortableList.GroupContent>
            </div>
        </SortableList.Group>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    expanded: boolean;
    hovered: boolean;
    onToggleExpanded?: () => void;
    icon?: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerStyle?: React.CSSProperties;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "bg-neutral-canvas sortable-list-item-header border-b-neutral-subtle px-3xs gap-x-3xs text-body-sm flex h-8 w-full items-center border-b",
                {
                    "bg-neutral-hovered!": props.hovered,
                },
            )}
            style={props.headerStyle}
        >
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <Button
                onClick={props.onToggleExpanded}
                title={props.expanded ? "Hide children" : "Show children"}
                variant="ghost"
                tone="neutral"
                size="small"
                iconOnly
            >
                {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </Button>
            <div className="gap-x-3xs flex min-w-0 grow items-center">
                {props.startAdornment}
                <div className="font-bolder min-w-0 grow">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
