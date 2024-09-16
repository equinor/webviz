import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2, point2Distance, vec2FromPointerEvent } from "@lib/utils/vec2";

import { isEqual } from "lodash";

import { SortableListGroupProps } from "./sortableListGroup";
import { SortableListItemProps } from "./sortableListItem";

export enum ItemType {
    ITEM = "item",
    GROUP = "group",
}

export type IsMoveAllowedArgs = {
    movedItemId: string;
    movedItemType: ItemType | null;
    originId: string | null;
    originType: ItemType | null;
    destinationId: string | null;
    destinationType: ItemType | null;
    position: number;
};

export type SortableListContextType = {
    draggedElementId: string | null;
    hoveredElementId: string | null;
    hoveredArea: HoveredArea | null;
    dragPosition: Vec2 | null;
};

export const SortableListContext = React.createContext<SortableListContextType>({
    draggedElementId: null,
    hoveredElementId: null,
    hoveredArea: null,
    dragPosition: null,
});

export type SortableListProps = {
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactElement<SortableListItemProps | SortableListGroupProps>[];
    isMoveAllowed?: (args: IsMoveAllowedArgs) => boolean;
    onItemMoved?: (
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number
    ) => void;
};

const ITEM_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT = 50;
const GROUP_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT = 30;
const DEFAULT_SCROLL_TIME = 100;

/**
 *
 * @param {SortableListProps} props Object of properties for the SortableList component (see below for details).
 * @param {function} props.onItemMoved Callback that is called when an item is moved. Should be wrapped inside a React.useCallback.
 * @param {function} props.isMoveAllowed Callback that is called to check if an item can be moved. Should be wrapped inside a React.useCallback.
 * @param {React.ReactNode} props.contentWhenEmpty A React node that is displayed when the list is empty.
 * @param {React.ReactNode} props.children Child components that must be of either type SortableListItem or SortableListGroup.
 *
 * @returns {React.ReactNode} A sortable list component.
 */
export function SortableList(props: SortableListProps): React.ReactNode {
    const { onItemMoved, isMoveAllowed } = props;

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
    const [hoveredItemIdAndArea, setHoveredItemIdAndArea] = React.useState<HoveredItemIdAndArea | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [prevChildren, setPrevChildren] = React.useState<
        React.ReactElement<SortableListItemProps | SortableListGroupProps>[]
    >(props.children);

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const listDivRef = React.useRef<HTMLDivElement>(null);
    const scrollDivRef = React.useRef<HTMLDivElement>(null);
    const upperScrollDivRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollDivRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevChildren, props.children)) {
        setPrevChildren(props.children);
        if (scrollDivRef.current) {
            scrollDivRef.current.scrollTop = currentScrollPosition;
        }
    }

    React.useEffect(
        function addEventListeners() {
            if (!listDivRef.current) {
                return;
            }

            if (!mainDivRef.current) {
                return;
            }

            const currentListDivRef = listDivRef.current;
            const currentMainDivRef = mainDivRef.current;

            let pointerDownPosition: Vec2 | null = null;
            let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let draggedElementInfo: ElementWithInfo | null = null;

            let currentlyHoveredElementInfo: HoveredElementWithInfo | null = null;

            let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
            let doScroll: boolean = false;
            let currentScrollTime = DEFAULT_SCROLL_TIME;

            function handlePointerDown(e: PointerEvent) {
                e.preventDefault();
                e.stopPropagation();
                const target = e.target;
                if (!target) {
                    return;
                }

                const sortableListItemProps = assertTargetIsSortableListItemAndExtractProps(target);
                if (!sortableListItemProps) {
                    return;
                }

                const element = sortableListItemProps.element;
                draggedElementInfo = {
                    element,
                    id: sortableListItemProps.id,
                    type: getItemType(element),
                    parent:
                        sortableListItemProps.parentElement && sortableListItemProps.parentId
                            ? {
                                  element: sortableListItemProps.parentElement,
                                  id: sortableListItemProps.parentId,
                                  type: sortableListItemProps.parentElement
                                      ? getItemType(sortableListItemProps.parentElement)
                                      : null,
                              }
                            : null,
                };

                pointerDownPosition = { x: e.clientX, y: e.clientY };
                draggingActive = false;

                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);

                e.preventDefault();
                e.stopPropagation();
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

            function getHoveredElementAndArea(e: PointerEvent): { element: HTMLElement; area: HoveredArea } | null {
                const elements = getDragElementsRecursively(currentListDivRef);
                for (const element of elements) {
                    if (rectContainsPoint(element.getBoundingClientRect(), vec2FromPointerEvent(e))) {
                        const type = getItemType(element);
                        if (type === ItemType.GROUP) {
                            const content = element.querySelector(".sortable-list-group-content");
                            if (
                                content &&
                                rectContainsPoint(content.getBoundingClientRect(), vec2FromPointerEvent(e)) &&
                                content.getElementsByClassName("sortable-list-item").length > 0
                            ) {
                                continue;
                            }
                        }

                        return { element, area: getHoveredAreaOfItem(element, e) };
                    }
                }

                // If no element was found, check if the pointer is in the bottom area of the main list
                const directChildren = elements.filter((el) => el.parentElement === currentListDivRef);
                const mainDivRect = currentMainDivRef.getBoundingClientRect();

                if (!rectContainsPoint(mainDivRect, vec2FromPointerEvent(e))) {
                    return null;
                }

                return { element: directChildren[directChildren.length - 1], area: HoveredArea.BOTTOM };
            }

            function getItemPositionInGroup(item: HTMLElement, ignoreItem?: HTMLElement): number {
                let group = item.parentElement?.closest(".sortable-list-group-content");
                if (!group || !(group instanceof HTMLElement)) {
                    group = currentListDivRef;
                }

                let pos = 0;
                for (let i = 0; i < group.children.length; i++) {
                    const elm = group.children[i];
                    if (!(elm instanceof HTMLElement) || getItemType(elm) === null) {
                        continue;
                    }
                    if (elm === ignoreItem) {
                        continue;
                    }
                    if (group.children[i] === item) {
                        return pos;
                    }
                    pos++;
                }

                throw new Error("Item not found in group");
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !draggedElementInfo) {
                    return;
                }

                if (
                    !draggingActive &&
                    point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    draggingActive = true;
                    setIsDragging(true);
                    setDraggedItemId(draggedElementInfo.id);
                }

                if (!draggingActive) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const dx = e.clientX - pointerDownPositionRelativeToElement.x;
                const dy = e.clientY - pointerDownPositionRelativeToElement.y;
                setDragPosition({ x: dx, y: dy });

                const point: Vec2 = { x: e.clientX, y: e.clientY };

                maybeScroll(point);

                if (rectContainsPoint(draggedElementInfo.element.getBoundingClientRect(), point)) {
                    // Hovering the dragged element itself
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const hoveredElementAndArea = getHoveredElementAndArea(e);
                if (!hoveredElementAndArea) {
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                if (hoveredElementAndArea.element === draggedElementInfo.element) {
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                if (
                    hoveredElementAndArea.element === getItemParent(draggedElementInfo.element) &&
                    hoveredElementAndArea.area === HoveredArea.HEADER
                ) {
                    // Dragged element should not be moved into its own parent
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const positionDelta = hoveredElementAndArea.area === HoveredArea.TOP ? 0 : 1;
                let newPosition =
                    getItemPositionInGroup(hoveredElementAndArea.element, draggedElementInfo.element) + positionDelta;
                const currentPosition = getItemPositionInGroup(draggedElementInfo.element);
                const draggedElementParentId = draggedElementInfo.parent?.id ?? null;

                if (
                    hoveredElementAndArea.area !== HoveredArea.HEADER &&
                    draggedElementParentId === getGroupId(getItemParent(hoveredElementAndArea.element)) &&
                    newPosition === currentPosition
                ) {
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const itemType = getItemType(hoveredElementAndArea.element);
                if (
                    itemType === ItemType.ITEM &&
                    (hoveredElementAndArea.area === HoveredArea.CENTER ||
                        hoveredElementAndArea.area === HoveredArea.HEADER)
                ) {
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const hoveredElementId = hoveredElementAndArea.element.dataset.itemId ?? "";
                const parentElement = getItemParent(hoveredElementAndArea.element);
                const parentType = parentElement ? getItemType(parentElement) : null;

                let destinationType = parentType;
                let destinationId = getGroupId(parentElement);

                if (itemType === ItemType.GROUP) {
                    if (
                        hoveredElementAndArea.area === HoveredArea.HEADER ||
                        hoveredElementAndArea.area === HoveredArea.CENTER
                    ) {
                        destinationType = ItemType.GROUP;
                        destinationId = hoveredElementId ?? "";
                        newPosition = 0;
                    }
                }

                if (
                    isMoveAllowed !== undefined &&
                    !isMoveAllowed({
                        movedItemId: draggedElementInfo.id,
                        movedItemType: draggedElementInfo.type,
                        originId: draggedElementInfo.parent?.id ?? null,
                        originType: draggedElementInfo.parent?.type ?? null,
                        destinationId,
                        destinationType,
                        position: newPosition,
                    })
                ) {
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                setHoveredItemIdAndArea({
                    id: hoveredElementId,
                    area: hoveredElementAndArea.area,
                });

                let parent: Omit<ElementWithInfo, "parent"> | null = null;
                if (parentElement && destinationId) {
                    parent = {
                        element: parentElement,
                        id: destinationId,
                        type: parentType,
                    };
                }

                currentlyHoveredElementInfo = {
                    ...hoveredElementAndArea,
                    id: hoveredElementId,
                    type: itemType,
                    parent,
                };
            }

            function maybeCallItemMoveCallback() {
                if (!onItemMoved) {
                    return;
                }

                if (!draggedElementInfo || !currentlyHoveredElementInfo) {
                    return;
                }

                const draggedElementParent = getItemParent(draggedElementInfo.element);

                const originId = getGroupId(draggedElementParent);

                const destination = getItemParent(currentlyHoveredElementInfo.element);
                let destinationId = getGroupId(destination);
                let destinationType = destination ? getItemType(destination) : null;

                const positionDelta = currentlyHoveredElementInfo.area === HoveredArea.TOP ? 0 : 1;
                let position =
                    getItemPositionInGroup(currentlyHoveredElementInfo.element, draggedElementInfo.element) +
                    positionDelta;

                if (
                    currentlyHoveredElementInfo.area === HoveredArea.HEADER ||
                    currentlyHoveredElementInfo.area === HoveredArea.CENTER
                ) {
                    destinationId = currentlyHoveredElementInfo.id;
                    destinationType = currentlyHoveredElementInfo.type;
                    position = 0;
                }

                if (isMoveAllowed !== undefined) {
                    if (
                        !isMoveAllowed({
                            movedItemId: draggedElementInfo.id,
                            movedItemType: draggedElementInfo.type,
                            originId: originId,
                            originType: getItemType(draggedElementInfo.element),
                            destinationId,
                            destinationType,
                            position,
                        })
                    ) {
                        return;
                    }
                }

                onItemMoved(draggedElementInfo.id, originId, destinationId, position);
            }

            function handlePointerUp() {
                maybeCallItemMoveCallback();
                cancelDragging();
            }

            function cancelDragging() {
                draggingActive = false;
                pointerDownPosition = null;
                draggedElementInfo = null;
                currentlyHoveredElementInfo = null;
                setIsDragging(false);
                setDraggedItemId(null);
                setHoveredItemIdAndArea(null);
                doScroll = false;

                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
            }

            function handleKeyDown(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    cancelDragging();
                }
            }

            function handleWindowBlur() {
                cancelDragging();
            }

            currentListDivRef.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("blur", handleWindowBlur);

            return function removeEventListeners() {
                currentListDivRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("blur", handleWindowBlur);
                setIsDragging(false);
                setDraggedItemId(null);
            };
        },
        [onItemMoved, isMoveAllowed, props.children]
    );

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    function makeChildren(): React.ReactNode[] {
        const children: React.ReactNode[] = [];
        if (props.children.length === 0 && props.contentWhenEmpty) {
            if (typeof props.contentWhenEmpty === "string") {
                children.push(props.contentWhenEmpty);
            } else if (React.isValidElement(props.contentWhenEmpty)) {
                children.push(
                    React.cloneElement(props.contentWhenEmpty, {
                        key: "contentWhenEmpty",
                    })
                );
            }
            return children;
        }

        for (const child of props.children) {
            if (typeof child.type === "string") {
                continue;
            }
            if (child.type.name === "SortableListItem") {
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                    })
                );
            } else {
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                    })
                );
            }
        }
        return children;
    }

    return (
        <div className="w-full h-full flex flex-col relative min-h-0 max-h-full" ref={mainDivRef}>
            <SortableListContext.Provider
                value={{
                    draggedElementId: draggedItemId,
                    hoveredElementId: hoveredItemIdAndArea?.id ?? null,
                    hoveredArea: hoveredItemIdAndArea?.area ?? null,
                    dragPosition,
                }}
            >
                <div
                    className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none"
                    ref={upperScrollDivRef}
                ></div>
                <div
                    className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none"
                    ref={lowerScrollDivRef}
                ></div>
                <div
                    className="flex-grow overflow-auto min-h-0 bg-slate-200 relative"
                    ref={scrollDivRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col relative min-h-0" ref={listDivRef}>
                        {makeChildren()}
                        <div className="h-2 min-h-2">
                            <div className="h-2" />
                        </div>
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
            </SortableListContext.Provider>
        </div>
    );
}

export enum HoveredArea {
    TOP = "top",
    BOTTOM = "bottom",
    HEADER = "header",
    CENTER = "center",
}

type ElementWithInfo = {
    element: HTMLElement;
    id: string;
    type: ItemType | null;
    parent: Omit<ElementWithInfo, "parent"> | null;
};

type HoveredElementWithInfo = ElementWithInfo & {
    area: HoveredArea;
};

type HoveredItemIdAndArea = {
    id: string;
    area: HoveredArea;
};

function assertTargetIsSortableListItemAndExtractProps(
    target: EventTarget | null
): { element: HTMLElement; id: string; parentElement: HTMLElement | null; parentId: string | null } | null {
    if (!target) {
        return null;
    }

    const element = target as HTMLElement;
    if (!element || !(element instanceof HTMLElement)) {
        return null;
    }

    const sortableListItemIndicator = element.closest(".sortable-list-element-indicator");
    if (!sortableListItemIndicator) {
        return null;
    }

    const sortableListElement = element.closest(".sortable-list-element");
    if (!sortableListElement) {
        return null;
    }

    if (!(sortableListElement instanceof HTMLElement)) {
        return null;
    }

    const id = sortableListElement.dataset.itemId;
    if (!id) {
        return null;
    }

    const parentGroup = getItemParent(sortableListElement);

    if (parentGroup) {
        const parentId = parentGroup.dataset.itemId;
        if (parentId) {
            return { element: sortableListElement, id, parentElement: parentGroup, parentId };
        }
    }

    return { element: sortableListElement, id, parentElement: null, parentId: null };
}

function getItemType(item: HTMLElement): ItemType | null {
    if (item.classList.contains("sortable-list-item")) {
        return ItemType.ITEM;
    } else if (item.classList.contains("sortable-list-group")) {
        return ItemType.GROUP;
    }
    return null;
}

function getHoveredAreaOfItem(item: HTMLElement, e: PointerEvent): HoveredArea {
    let factor = ITEM_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT / 100;
    const rect = item.getBoundingClientRect();

    const topAreaTop = rect.top;
    const bottomAreaBottom = rect.bottom;

    let topAreaBottom = rect.top + factor * rect.height;
    let bottomAreaTop = rect.bottom - factor * rect.height;
    if (getItemType(item) === ItemType.GROUP) {
        factor = GROUP_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT / 100;
        topAreaBottom = rect.top + Math.min(10, factor * rect.height);
        bottomAreaTop = rect.bottom - Math.min(10, factor * rect.height);
    }

    if (e.clientY >= topAreaTop && e.clientY <= topAreaBottom) {
        return HoveredArea.TOP;
    }

    if (e.clientY >= bottomAreaTop && e.clientY <= bottomAreaBottom) {
        return HoveredArea.BOTTOM;
    }

    const headerElement = item.querySelector(".sortable-list-item-header");
    if (headerElement) {
        const headerRect = headerElement.getBoundingClientRect();
        if (rectContainsPoint(headerRect, { x: e.clientX, y: e.clientY })) {
            return HoveredArea.HEADER;
        }
    }

    return HoveredArea.CENTER;
}

function getItemParent(item: HTMLElement | null): HTMLElement | null {
    if (!item) {
        return null;
    }

    const group = item.parentElement?.closest(".sortable-list-group");
    if (!group || !(group instanceof HTMLElement)) {
        return null;
    }
    return group;
}

function getGroupId(group: HTMLElement | null): string | null {
    return group?.dataset.itemId ?? null;
}

function getDragElementsRecursively(parentElement: HTMLElement): HTMLElement[] {
    const items: HTMLElement[] = [];

    for (const child of parentElement.children) {
        if (child instanceof HTMLElement && child.classList.contains("sortable-list-item")) {
            items.push(child);
        }
        if (child instanceof HTMLElement && child.classList.contains("sortable-list-group")) {
            items.push(child);
            const content = child.querySelector(".sortable-list-group-content");
            if (content && content instanceof HTMLElement) {
                items.push(...getDragElementsRecursively(content));
            }
        }
    }
    return items;
}
