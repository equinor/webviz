import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2, point2Distance } from "@lib/utils/vec2";

import { DragListContainerProps } from "./dragListContainer";
import { DragListItemProps } from "./dragListItem";

export type DragListProps = {
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactElement<DragListItemProps | DragListContainerProps>[];
    onItemsOrderChange?: (containerId: string | null, itemsOrder: string[]) => void;
    onItemMove?: (itemId: string, containerId: string | null, position: number) => void;
};

function assertTargetIsDragListItemAndExtractProps(
    target: EventTarget | null
): { element: HTMLElement; id: string } | null {
    if (!target) {
        return null;
    }

    const element = target as HTMLElement;
    if (!element || !(element instanceof HTMLElement)) {
        return null;
    }

    const dragListItemIndicator = element.closest(".drag-list-element-indicator");
    if (!dragListItemIndicator) {
        return null;
    }

    const dragListItem = element.closest(".drag-list-element");
    if (!dragListItem) {
        return null;
    }

    if (!(dragListItem instanceof HTMLElement)) {
        return null;
    }

    const id = dragListItem.dataset.itemId;
    if (!id) {
        return null;
    }

    return { element, id };
}

enum HoveredArea {
    TOP = "top",
    BOTTOM = "bottom",
    CENTER = "center",
}

enum ItemType {
    ITEM = "item",
    CONTAINER = "container",
}

type HoveredItemIdAndArea = {
    id: string;
    area: HoveredArea;
};

const ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX = 10;

export function DragList(props: DragListProps): React.ReactNode {
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
    const [hoveredItemIdAndArea, setHoveredItemIdAndArea] = React.useState<HoveredItemIdAndArea | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [droppable, setDroppable] = React.useState<boolean>(false);

    const listDivRef = React.useRef<HTMLDivElement>(null);
    const scrollDivRef = React.useRef<HTMLDivElement>(null);
    const upperScrollDivRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollDivRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(function handleMount() {
        if (!listDivRef.current) {
            return;
        }

        const currentListDivRef = listDivRef.current;

        let pointerDownPosition: Vec2 | null = null;
        let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
        let draggingActive: boolean = false;
        let itemId: string | null = null;

        let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
        let doScroll: boolean = false;
        let currentScrollTime = 100;

        function handlePointerDown(e: PointerEvent) {
            const target = e.target;
            if (!target) {
                return;
            }

            const dragListItemProps = assertTargetIsDragListItemAndExtractProps(target);
            if (!dragListItemProps) {
                return;
            }

            const element = dragListItemProps.element;
            itemId = dragListItemProps.id;

            pointerDownPosition = { x: e.clientX, y: e.clientY };
            draggingActive = false;
            setIsDragging(true);

            pointerDownPositionRelativeToElement = {
                x: e.clientX - element.getBoundingClientRect().left,
                y: e.clientY - element.getBoundingClientRect().top,
            };
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);

            setIsDragging(true);
        }

        function maybeScroll(position: Vec2) {
            if (
                upperScrollDivRef.current === null ||
                lowerScrollDivRef.current === null ||
                scrollDivRef.current === null
            ) {
                return;
            }

            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
                currentScrollTime = 100;
            }

            if (rectContainsPoint(upperScrollDivRef.current.getBoundingClientRect(), position)) {
                doScroll = true;
                scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
            } else if (rectContainsPoint(lowerScrollDivRef.current.getBoundingClientRect(), position)) {
                doScroll = true;
                scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
            } else {
                doScroll = false;
            }
        }

        function scrollUpRepeatedly() {
            currentScrollTime = Math.max(10, currentScrollTime - 5);
            if (scrollDivRef.current) {
                scrollDivRef.current.scrollTop = Math.max(0, scrollDivRef.current.scrollTop - 10);
            }
            if (doScroll) {
                scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
            }
        }

        function scrollDownRepeatedly() {
            currentScrollTime = Math.max(10, currentScrollTime - 5);
            if (scrollDivRef.current) {
                scrollDivRef.current.scrollTop = Math.min(
                    scrollDivRef.current.scrollHeight,
                    scrollDivRef.current.scrollTop + 10
                );
            }
            if (doScroll) {
                scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
            }
        }

        function getItems(): HTMLElement[] {
            return Array.from(currentListDivRef.children).filter((child) => {
                return child instanceof HTMLElement && child.classList.contains("drag-list-item");
            }) as HTMLElement[];
        }

        function getHoveredItem(e: PointerEvent): HTMLElement | null {
            const items = getItems();
            for (const item of items) {
                if (rectContainsPoint(item.getBoundingClientRect(), { x: e.clientX, y: e.clientY })) {
                    return item;
                }
            }

            return null;
        }

        function getHoveredItemType(item: HTMLElement): ItemType | null {
            if (item.classList.contains("drag-list-item")) {
                return ItemType.ITEM;
            } else if (item.classList.contains("drag-list-container")) {
                return ItemType.CONTAINER;
            }
            return null;
        }

        function getHoveredAreaOfItem(item: HTMLElement, e: PointerEvent): HoveredArea {
            const rect = item.getBoundingClientRect();
            const topAreaTop = rect.top;
            const topAreaBottom = rect.top + ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX;
            const bottomAreaTop = rect.bottom - ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX;
            const bottomAreaBottom = rect.bottom;

            if (e.clientY >= topAreaTop && e.clientY <= topAreaBottom) {
                return HoveredArea.TOP;
            } else if (e.clientY >= bottomAreaTop && e.clientY <= bottomAreaBottom) {
                return HoveredArea.BOTTOM;
            } else {
                return HoveredArea.CENTER;
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!pointerDownPosition || !itemId) {
                return;
            }

            if (
                !draggingActive &&
                point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
            ) {
                draggingActive = true;
                setDraggedItemId(itemId);
            }

            if (!draggingActive) {
                return;
            }

            const dx = e.clientX - pointerDownPositionRelativeToElement.x;
            const dy = e.clientY - pointerDownPositionRelativeToElement.y;
            setDragPosition({ x: dx, y: dy });

            const point: Vec2 = { x: e.clientX, y: e.clientY };

            maybeScroll(point);

            const hoveredItem = getHoveredItem(e);
            if (hoveredItem && hoveredItem instanceof HTMLElement) {
                const area = getHoveredAreaOfItem(hoveredItem, e);
                const itemType = getHoveredItemType(hoveredItem);
                if (itemType === ItemType.ITEM && area === HoveredArea.CENTER) {
                    setHoveredItemIdAndArea(null);
                    return;
                }
                setHoveredItemIdAndArea({ id: hoveredItem.dataset.itemId ?? "", area });
            } else {
                setHoveredItemIdAndArea(null);
            }
        }

        function handlePointerUp() {
            draggingActive = false;
            pointerDownPosition = null;
            itemId = null;
            setIsDragging(false);
            setDraggedItemId(null);
            setHoveredItemIdAndArea(null);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        }

        currentListDivRef.addEventListener("pointerdown", handlePointerDown);

        return function handleUnmount() {
            currentListDivRef.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, []);

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    function makeChildren(): React.ReactNode[] {
        const children: React.ReactNode[] = [];
        for (const child of props.children) {
            if (typeof child.type === "string") {
                continue;
            }
            if (child.type.name === "DragListItem") {
                if (child.props.id === hoveredItemIdAndArea?.id && hoveredItemIdAndArea.area === HoveredArea.TOP) {
                    children.push(<DragListDropIndicator key="drop-indicator-top" />);
                }
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                        isDragging: child.props.id === draggedItemId,
                        dragPosition,
                    })
                );
                if (child.props.id === hoveredItemIdAndArea?.id && hoveredItemIdAndArea.area === HoveredArea.BOTTOM) {
                    children.push(<DragListDropIndicator key="drop-indicator-bottom" />);
                }
            } else {
                if (child.props.id === hoveredItemIdAndArea?.id && hoveredItemIdAndArea.area === HoveredArea.TOP) {
                    children.push(<DragListDropIndicator key="drop-indicator-top" />);
                }
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                        isDragging: child.props.id === draggedItemId,
                        dragPosition,
                        isHovered:
                            child.props.id === hoveredItemIdAndArea?.id &&
                            hoveredItemIdAndArea.area === HoveredArea.CENTER,
                    })
                );
                if (child.props.id === hoveredItemIdAndArea?.id && hoveredItemIdAndArea.area === HoveredArea.BOTTOM) {
                    children.push(<DragListDropIndicator key="drop-indicator-bottom" />);
                }
            }
        }
        return children;
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none" ref={upperScrollDivRef}></div>
            <div className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none" ref={lowerScrollDivRef}></div>
            <div
                className="flex-grow overflow-auto min-h-0 bg-slate-200 relative"
                ref={scrollDivRef}
                onScroll={handleScroll}
            >
                <div className="flex flex-col border border-slate-100 relative max-h-0" ref={listDivRef}>
                    {makeChildren()}
                </div>
            </div>
            {isDragging &&
                createPortal(
                    <div
                        className={resolveClassNames("absolute z-[100] inset-0", {
                            "cursor-not-allowed": !hoveredItemIdAndArea,
                            "cursor-grabbing": hoveredItemIdAndArea !== null,
                        })}
                    ></div>
                )}
        </div>
    );
}

function DragListDropIndicator() {
    return (
        <div className="w-full h-0 relative">
            <div className="absolute -top-0.5 h-1 w-full bg-blue-800 z-10"></div>
        </div>
    );
}
