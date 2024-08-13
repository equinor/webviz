import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";

import { DragListContext, HoveredArea } from "./dragList";
import { DragListDropIndicator } from "./dragListDropIndicator";
import { DragListItemProps } from "./dragListItem";

export type DragListGroupProps = {
    id: string;
    icon?: React.ReactNode;
    title: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactElement<DragListItemProps>[];
};

export function DragListGroup(props: DragListGroupProps): React.ReactNode {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

    const divRef = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(divRef);
    const dragListContext = React.useContext(DragListContext);

    const isHovered = dragListContext.hoveredElementId === props.id;
    const isHeaderHovered = isHovered && dragListContext.hoveredArea === HoveredArea.HEADER;
    const isDragging = dragListContext.draggedElementId === props.id;
    const dragPosition = dragListContext.dragPosition;

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    return (
        <>
            {isHovered && dragListContext.hoveredArea === HoveredArea.TOP && <DragListDropIndicator />}
            <div
                className={resolveClassNames("drag-list-element drag-list-group relative", {
                    "bg-blue-200": isHeaderHovered,
                    "bg-gray-200": !isHeaderHovered,
                })}
                data-item-id={props.id}
                ref={divRef}
            >
                <div
                    className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0 bg-blue-500", {
                        hidden: !isDragging,
                    })}
                ></div>
                <Header onToggleExpanded={handleToggleExpanded} expanded={isExpanded} {...props} />
                {isDragging &&
                    dragPosition &&
                    createPortal(
                        <div
                            className={resolveClassNames(
                                "flex h-8 px-1 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
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
                <div
                    className={resolveClassNames(
                        "drag-list-group-content pl-2 bg-white mb-1 shadow-inner border-b border-b-gray-300",
                        {
                            "overflow-hidden h-[0px]": !isExpanded,
                        }
                    )}
                >
                    {props.children.length === 0 ? props.contentWhenEmpty : props.children}
                </div>
            </div>
            {isHovered && dragListContext.hoveredArea === HoveredArea.BOTTOM && <DragListDropIndicator />}
        </>
    );
}

type HeaderProps = {
    title: string;
    expanded: boolean;
    onToggleExpanded?: () => void;
    icon?: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div className="drag-list-item-header flex items-center gap-1 h-8 text-sm font-bold border-b border-b-gray-300">
            <div className={resolveClassNames("drag-list-element-indicator px-0.5 hover:cursor-grab")}>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </div>
            <div
                className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                onClick={props.onToggleExpanded}
                title={props.expanded ? "Hide children" : "Show children"}
            >
                {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </div>
            <div className="flex items-center gap-2">
                {props.icon}
                <div className="flex-grow">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
