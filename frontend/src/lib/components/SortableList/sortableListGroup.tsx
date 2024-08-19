import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";

import { HoveredArea, SortableListContext } from "./sortableList";
import { SortableListDropIndicator } from "./sortableListDropIndicator";
import { SortableListItemProps } from "./sortableListItem";

export type SortableListGroupProps = {
    id: string;
    title: React.ReactNode;
    initiallyExpanded?: boolean;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    contentWhenEmpty?: React.ReactNode;
    children?: React.ReactElement<SortableListItemProps>[];
};

/**
 *
 * @param {SortableListGroupProps} props Object of properties for the SortableListGroup component (see below for details).
 * @param {string} props.id ID that is unique among all components inside the sortable list.
 * @param {React.ReactNode} props.title Title of the list item.
 * @param {boolean} props.initiallyExpanded Whether the group should be expanded by default.
 * @param {React.ReactNode} props.startAdornment Start adornment to display to the left of the title.
 * @param {React.ReactNode} props.endAdornment End adornment to display to the right of the title.
 * @param {React.ReactNode} props.children Child components to display as the content of the list item.
 *
 * @returns {React.ReactNode} A sortable list group component.
 */
export function SortableListGroup(props: SortableListGroupProps): React.ReactNode {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(props.initiallyExpanded ?? true);

    const divRef = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(divRef);
    const sortableListContext = React.useContext(SortableListContext);

    const isHovered = sortableListContext.hoveredElementId === props.id;
    const isHeaderHovered =
        isHovered &&
        (sortableListContext.hoveredArea === HoveredArea.HEADER ||
            sortableListContext.hoveredArea === HoveredArea.CENTER);
    const isDragging = sortableListContext.draggedElementId === props.id;
    const dragPosition = sortableListContext.dragPosition;

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    const hasContent = props.children !== undefined && props.children.length > 0;

    return (
        <>
            {isHovered && sortableListContext.hoveredArea === HoveredArea.TOP && <SortableListDropIndicator />}
            <div
                className={resolveClassNames("sortable-list-element sortable-list-group relative bg-gray-200")}
                data-item-id={props.id}
                ref={divRef}
            >
                <div
                    className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0 bg-blue-500", {
                        hidden: !isDragging,
                    })}
                ></div>
                <Header
                    onToggleExpanded={handleToggleExpanded}
                    expanded={isExpanded}
                    expandable={hasContent}
                    hovered={isHeaderHovered}
                    {...props}
                />
                {isDragging &&
                    dragPosition &&
                    createPortal(
                        <div
                            className={resolveClassNames(
                                "flex h-8 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50 opacity-75"
                            )}
                            style={{
                                left: dragPosition.x,
                                top: dragPosition.y,
                                width: isDragging ? boundingClientRect.width : undefined,
                            }}
                        >
                            <Header
                                expanded={isExpanded}
                                expandable={hasContent}
                                hovered={isHeaderHovered}
                                {...props}
                            />
                        </div>
                    )}
                <div
                    className={resolveClassNames(
                        "sortable-list-group-content ml-1 bg-white shadow-inner border-b border-b-gray-300",
                        {
                            hidden: !isExpanded,
                        }
                    )}
                >
                    {hasContent ? props.children : props.contentWhenEmpty}
                </div>
            </div>
            {isHovered && sortableListContext.hoveredArea === HoveredArea.BOTTOM && <SortableListDropIndicator />}
        </>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    expanded: boolean;
    expandable: boolean;
    hovered: boolean;
    onToggleExpanded?: () => void;
    icon?: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "sortable-list-item-header flex w-full items-center gap-1 h-8 text-sm border-b border-b-gray-400 px-2",
                {
                    "bg-blue-300": props.hovered,
                    "bg-slate-300": !props.hovered,
                }
            )}
        >
            <div className={resolveClassNames("sortable-list-element-indicator hover:cursor-grab")}>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </div>
            {props.expandable && (
                <div
                    className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                    onClick={props.onToggleExpanded}
                    title={props.expanded ? "Hide children" : "Show children"}
                >
                    {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
            )}
            <div className="flex items-center gap-2 flex-grow">
                {props.startAdornment}
                <div className="flex-grow font-bold">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
