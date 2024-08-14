import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";

import { HoveredArea, SortableListContext } from "./sortableList";
import { SortableListDropIndicator } from "./sortableListDropIndicator";

export type SortableListItemProps = {
    id: string;
    title: React.ReactNode;
    initiallyExpanded?: boolean;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    children: React.ReactNode;
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
    const [isExpanded, setIsExpanded] = React.useState<boolean>(props.initiallyExpanded ?? true);

    const divRef = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(divRef);

    const sortableListContext = React.useContext(SortableListContext);

    const isHovered = sortableListContext.hoveredElementId === props.id;
    const isDragging = sortableListContext.draggedElementId === props.id;
    const dragPosition = sortableListContext.dragPosition;

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    return (
        <>
            {isHovered && sortableListContext.hoveredArea === HoveredArea.TOP && <SortableListDropIndicator />}
            <div
                className={resolveClassNames("sortable-list-element sortable-list-item flex flex-col relative")}
                data-item-id={props.id}
                ref={divRef}
            >
                <div
                    className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0 bg-blue-500", {
                        hidden: !isDragging,
                    })}
                ></div>
                <Header expanded={isExpanded} onToggleExpanded={handleToggleExpanded} {...props} />
                {isDragging &&
                    dragPosition &&
                    createPortal(
                        <div
                            className={resolveClassNames(
                                "flex h-10 px-1 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50 opacity-75"
                            )}
                            style={{
                                left: dragPosition.x,
                                top: dragPosition.y,
                                width: isDragging ? boundingClientRect.width : undefined,
                            }}
                        >
                            <Header expanded={isExpanded} {...props} />
                        </div>
                    )}
                <div className={resolveClassNames("bg-white border-b shadow-inner", { hidden: !isExpanded })}>
                    {props.children}
                </div>
            </div>
            {isHovered && sortableListContext.hoveredArea === HoveredArea.BOTTOM && <SortableListDropIndicator />}
        </>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    expanded: boolean;
    onToggleExpanded?: () => void;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div className="flex gap-1 h-8 bg-slate-100 hover:bg-blue-100 text-sm items-center border-b border-b-gray-300 pr-2">
            <div className={resolveClassNames("sortable-list-element-indicator px-0.5 hover:cursor-grab")}>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 flex-grow">
                {props.startAdornment}
                <div className="flex-grow">{props.title}</div>
                {props.endAdornment}
            </div>
            <div
                className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                onClick={props.onToggleExpanded}
                title={props.expanded ? "Hide children" : "Show children"}
            >
                {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </div>
        </div>
    );
}
