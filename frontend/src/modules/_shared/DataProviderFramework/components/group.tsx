import React from "react";

import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";
import { isEqual } from "lodash";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableList } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SortableListGroupProps = {
    id: string;
    title: React.ReactNode;
    expanded?: boolean;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerStyle?: React.CSSProperties;
    content?: React.ReactNode;
    contentStyle?: React.CSSProperties;
    contentWhenEmpty?: React.ReactNode;
    children?: React.ReactElement[];
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
    const [isExpanded, setIsExpanded] = React.useState<boolean>(props.expanded ?? true);
    const [prevExpanded, setPrevExpanded] = React.useState<boolean | undefined>(props.expanded);

    if (!isEqual(props.expanded, prevExpanded)) {
        if (props.expanded !== undefined) {
            setIsExpanded(props.expanded);
        }
        setPrevExpanded(props.expanded);
    }

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    const hasContent = props.children !== undefined && props.children.length > 0;

    return (
        <SortableList.Group id={props.id}>
            <div className={resolveClassNames("bg-gray-200")}>
                <Header {...props} onToggleExpanded={handleToggleExpanded} expanded={isExpanded} hovered={false} />
                <SortableList.GroupContent>
                    <div
                        className={resolveClassNames("pl-1 bg-white shadow-inner border-b border-b-gray-300", {
                            hidden: !isExpanded,
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
                "sortable-list-item-header flex w-full items-center gap-1 h-8 text-sm border-b border-b-gray-400 px-2",
                {
                    "bg-blue-300!": props.hovered,
                    "bg-slate-300": !props.hovered,
                },
            )}
            style={props.headerStyle}
        >
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <DenseIconButton
                onClick={props.onToggleExpanded}
                title={props.expanded ? "Hide children" : "Show children"}
            >
                {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </DenseIconButton>
            <div className="flex items-center gap-2 grow min-w-0">
                {props.startAdornment}
                <div className="grow font-bold min-w-0">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
