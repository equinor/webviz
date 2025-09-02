import React from "react";

import { isEqual } from "lodash";

import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";
import { point2Distance, vec2FromPointerEvent } from "@lib/utils/vec2";

import { Content } from "./sub-components/Content";
import { DragHandle } from "./sub-components/dragHandle";
import { Group } from "./sub-components/Group";
import { Item } from "./sub-components/Item";
import { ScrollContainer } from "./sub-components/ScrollContainer";

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

    registerContentContainer: (el: HTMLElement | null) => void;
    reportContentBoundingRect: (rect: DOMRectReadOnly) => void;
    registerScrollContainerElement: (el: HTMLElement | null) => void;
};

export const SortableListContext = React.createContext<SortableListContextType>({
    draggedElementId: null,
    hoveredElementId: null,
    hoveredArea: null,
    dragPosition: null,

    registerContentContainer: () => {},
    reportContentBoundingRect: () => {},
    registerScrollContainerElement: () => {},
});

export type SortableListProps = {
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactNode;
    isMoveAllowed?: (args: IsMoveAllowedArgs) => boolean;
    onItemMoved?: (
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number,
    ) => void;
};

export type SortableListCompound = React.FC<SortableListProps> & {
    Content: typeof Content;
    ScrollContainer: typeof ScrollContainer;
    Item: typeof Item;
    Group: typeof Group;
    DragHandle: typeof DragHandle;
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
export const SortableList = function SortableListImpl(props: SortableListProps) {
    const { onItemMoved, isMoveAllowed } = props;

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
    const [hoveredItemIdAndArea, setHoveredItemIdAndArea] = React.useState<HoveredItemIdAndArea | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [prevChildren, setPrevChildren] = React.useState<React.ReactNode>(props.children);
    const [contentContainerElement, setContentContainerElement] = React.useState<HTMLElement | null>(null);
    const [scrollContainerElement, setScrollContainerElement] = React.useState<HTMLElement | null>(null);
    const [contentContainerRect, setContentContainerRect] = React.useState<DOMRectReadOnly | null>(null);

    const context = React.useMemo<SortableListContextType>(
        () => ({
            draggedElementId: draggedItemId,
            hoveredElementId: hoveredItemIdAndArea?.id ?? null,
            hoveredArea: hoveredItemIdAndArea?.area ?? null,
            dragPosition,
            registerContentContainer: setContentContainerElement,
            registerScrollContainerElement: setScrollContainerElement,
            reportContentBoundingRect: setContentContainerRect,
        }),
        [draggedItemId, hoveredItemIdAndArea, dragPosition],
    );

    const mainRef = React.useRef<HTMLDivElement>(null);
    /*
    const listRef = React.useRef<DomFor<TRoot>>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    */
    const upperScrollRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevChildren, props.children)) {
        setPrevChildren(props.children);
        if (scrollContainerElement) {
            scrollContainerElement.scrollTop = currentScrollPosition;
        }
    }

    React.useEffect(
        function addEventListeners() {
            if (!contentContainerElement) {
                return;
            }

            if (!mainRef.current) {
                return;
            }

            const currentListRef = contentContainerElement;
            const currentMainRef = mainRef.current;

            let pointerDownPosition: Vec2 | null = null;
            let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let draggedElementInfo: ElementWithInfo | null = null;

            let currentlyHoveredElementInfo: HoveredElementWithInfo | null = null;

            let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
            let doScroll: boolean = false;
            let currentScrollTime = DEFAULT_SCROLL_TIME;

            function handlePointerDown(e: PointerEvent) {
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
                    upperScrollRef.current === null ||
                    lowerScrollRef.current === null ||
                    scrollContainerElement === null
                ) {
                    return;
                }

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                    currentScrollTime = 100;
                }

                if (rectContainsPoint(upperScrollRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                } else if (rectContainsPoint(lowerScrollRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                } else {
                    doScroll = false;
                }
            }

            function scrollUpRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollContainerElement) {
                    scrollContainerElement.scrollTop = Math.max(0, scrollContainerElement.scrollTop - 10);
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                }
            }

            function scrollDownRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollContainerElement) {
                    scrollContainerElement.scrollTop = Math.min(
                        scrollContainerElement.scrollHeight,
                        scrollContainerElement.scrollTop + 10,
                    );
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                }
            }

            function getHoveredElementAndArea(e: PointerEvent): { element: HTMLElement; area: HoveredArea } | null {
                const elements = getDragElementsRecursively(currentListRef);
                for (const element of elements) {
                    if (rectContainsPoint(element.getBoundingClientRect(), vec2FromPointerEvent(e))) {
                        const type = getItemType(element);
                        if (type === ItemType.GROUP) {
                            const content = element.querySelector(".sortable-list-group-content");
                            if (
                                content &&
                                rectContainsPoint(content.getBoundingClientRect(), vec2FromPointerEvent(e)) &&
                                (content.getElementsByClassName("sortable-list-item").length > 0 ||
                                    content.getElementsByClassName("sortable-list-group").length > 0)
                            ) {
                                continue;
                            }
                        }

                        return { element, area: getHoveredAreaOfItem(element, e) };
                    }
                }

                // If no element was found, check if the pointer is in the bottom area of the main list
                const directChildren = elements.filter((el) => el.parentElement === currentListRef);
                const mainDivRect = currentMainRef.getBoundingClientRect();

                if (!rectContainsPoint(mainDivRect, vec2FromPointerEvent(e))) {
                    return null;
                }

                if (directChildren.length === 0) return null;
                return { element: directChildren[directChildren.length - 1], area: HoveredArea.BOTTOM };
            }

            function getItemPositionInGroup(item: HTMLElement, ignoreItem?: HTMLElement): number {
                let group = item.parentElement?.closest(".sortable-list-group-content");
                if (!group || !(group instanceof HTMLElement)) {
                    group = currentListRef;
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
                    ![HoveredArea.HEADER, HoveredArea.CENTER].includes(hoveredElementAndArea.area) &&
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

            currentListRef.addEventListener("pointerdown", handlePointerDown as EventListener);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("blur", handleWindowBlur);

            return function removeEventListeners() {
                currentListRef.removeEventListener("pointerdown", handlePointerDown as EventListener);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("blur", handleWindowBlur);
                setIsDragging(false);
                setDraggedItemId(null);
            };
        },
        [
            onItemMoved,
            isMoveAllowed,
            props.children,
            currentScrollPosition,
            scrollContainerElement,
            contentContainerElement,
        ],
    );

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    /*

    function makeChildren(): React.ReactNode[] {
        const children: React.ReactNode[] = [];
        if (props.children.length === 0 && props.contentWhenEmpty) {
            if (typeof props.contentWhenEmpty === "string") {
                children.push(props.contentWhenEmpty);
            } else if (React.isValidElement(props.contentWhenEmpty)) {
                children.push(
                    React.cloneElement(props.contentWhenEmpty, {
                        key: "contentWhenEmpty",
                    }),
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
                    }),
                );
            } else {
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                    }),
                );
            }
        }
        return children;
    }
        */

    return (
        <div className="w-full h-full flex flex-col relative min-h-0 max-h-full" ref={mainRef}>
            <SortableListContext.Provider value={context}>
                <div className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none" ref={upperScrollRef}></div>
                <div
                    className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none"
                    ref={lowerScrollRef}
                ></div>
                {props.children}
                {isDragging &&
                    createPortal(
                        <div
                            className={resolveClassNames("absolute z-100 inset-0", {
                                "cursor-not-allowed": !hoveredItemIdAndArea,
                                "cursor-grabbing": hoveredItemIdAndArea !== null,
                            })}
                        ></div>,
                    )}
            </SortableListContext.Provider>
        </div>
    );
} as SortableListCompound;

SortableList.Content = Content;
SortableList.ScrollContainer = ScrollContainer;
SortableList.Item = Item;
SortableList.Group = Group;
SortableList.DragHandle = DragHandle;

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
    target: EventTarget | null,
): { element: HTMLElement; id: string; parentElement: HTMLElement | null; parentId: string | null } | null {
    if (!target || !(target instanceof HTMLElement)) {
        return null;
    }

    const handle = target.closest("[data-sort-handle]");
    if (!handle) {
        return null;
    }

    const sortableListElement = handle.closest("[data-sortable='item'], [data-sortable='group']");
    if (!(sortableListElement instanceof HTMLElement)) {
        return null;
    }

    const id = sortableListElement.dataset.itemId;
    if (!id) {
        return null;
    }

    const parentGroup = getItemParent(sortableListElement);
    const parentId = parentGroup?.dataset.itemId ?? null;

    return { element: sortableListElement, id, parentElement: parentGroup, parentId };
}

function getItemType(item: HTMLElement): ItemType | null {
    const attr = item.getAttribute("data-sortable");
    if (attr === "item") return ItemType.ITEM;
    if (attr === "group") return ItemType.GROUP;
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

    const group = item.parentElement?.closest("[data-sortable='group']");
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
        if (!(child instanceof HTMLElement)) continue;

        if (child.getAttribute("data-sortable") === "item") {
            items.push(child);
        }
        if (child.getAttribute("data-sortable") === "group") {
            items.push(child);
            const content = child.querySelector(".sortable-list-group-content");
            if (content && content instanceof HTMLElement) {
                items.push(...getDragElementsRecursively(content));
            }
        }
    }
    return items;
}
