import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";
import { point2Distance, vec2FromPointerEvent } from "@lib/utils/vec2";

import { Content } from "./private/content";
import { DraggedElementPlaceholder } from "./private/draggedElementPlaceholder";
import { DragHandle } from "./private/dragHandle";
import { DropIndicatorOverlay } from "./private/dropIndicatorOverlay";
import { Group } from "./private/group";
import { GroupContent } from "./private/groupContent";
import { GroupDropOverlay } from "./private/groupDropOverlay";
import { Item } from "./private/item";
import { NoDropZone } from "./private/noDropZone";
import { ScrollContainer } from "./private/scrollContainer";

export enum ItemType {
    ITEM = "item",
    GROUP = "group",
}

enum Cursor {
    GRABBING = "grabbing",
    NOT_ALLOWED = "not-allowed",
    NONE = "none",
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
    registerScrollContainerElement: (el: HTMLElement | null) => void;
    registerNoDropZoneElement: (el: HTMLElement | null) => void;
    unregisterNoDropZoneElement: (el: HTMLElement | null) => void;
    setScrollOverlayMargins: (args: { top: number; bottom: number }) => void;
};

export const SortableListContext = React.createContext<SortableListContextType>({
    draggedElementId: null,
    hoveredElementId: null,
    hoveredArea: null,
    dragPosition: null,

    registerContentContainer: () => {},
    registerScrollContainerElement: () => {},
    registerNoDropZoneElement: () => {},
    unregisterNoDropZoneElement: () => {},
    setScrollOverlayMargins: () => {},
});

export type SortableListProps = {
    children: React.ReactNode;
    isMoveAllowed?: (args: IsMoveAllowedArgs) => boolean;
    onItemMoved?: (
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number,
    ) => void;
    className?: string;
};

export type SortableListCompound = React.FC<SortableListProps> & {
    Content: typeof Content;
    ScrollContainer: typeof ScrollContainer;
    Item: typeof Item;
    Group: typeof Group;
    NoDropZone: typeof NoDropZone;
    DragHandle: typeof DragHandle;
    GroupContent: typeof GroupContent;
};

// This defines the size of the areas determining if the dragged item should be inserted above or below the hovered item
const ITEM_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT = 50;
// This defines the size of the areas determining if the the dragged item should be inserted above or below the hovered group
const GROUP_TOP_AND_BOTTOM_AREA_SIZE_IN_PERCENT = 30;
// Defines after how many milliseconds hover time over the top or bottom of the sroll container it should start scrolling
const DEFAULT_SCROLL_TIME = 100;
// Defines the size of the area at the top and bottom of the scroll container where auto-scrolling should start
const AUTO_SCROLL_EDGE_PX = 20;

/**
 *
 * @param {SortableListProps} props Object of properties for the SortableList component (see below for details).
 * @param {function} props.onItemMoved Callback that is called when an item is moved. Should be wrapped inside a React.useCallback.
 * @param {function} props.isMoveAllowed Callback that is called to check if an item can be moved. Should be wrapped inside a React.useCallback.
 * @param {React.ReactNode} props.children Child components that must be of either type SortableListItem or SortableListGroup.
 * @param {string} props.className Optional class name for the main list container.
 *
 * @returns {React.ReactNode} A sortable list component.
 */
export const SortableList = function SortableListImpl(props: SortableListProps) {
    const { onItemMoved, isMoveAllowed } = props;

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
    const [hoveredItemIdAndArea, setHoveredItemIdAndArea] = React.useState<HoveredItemIdAndArea | null>(null);
    const [cursor, setCursor] = React.useState<Cursor>(Cursor.NONE);
    const [isScrolling, setIsScrolling] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [contentContainerElement, setContentContainerElement] = React.useState<HTMLElement | null>(null);
    const [scrollContainerElement, setScrollContainerElement] = React.useState<HTMLElement | null>(null);
    const [scrollOverlayMargins, setScrollOverlayMargins] = React.useState<{ top: number; bottom: number }>({
        top: 0,
        bottom: 0,
    });
    const [noDropZoneElements, setNoDropZoneElements] = React.useState<Set<HTMLElement>>(new Set());

    const registerNoDropZoneElement = React.useCallback(function registerNoDropZoneElement(el: HTMLElement | null) {
        setNoDropZoneElements((prev) => {
            if (el && !prev.has(el)) {
                const next = new Set(prev);
                next.add(el);
                return next;
            }
            return prev;
        });
    }, []);
    const unregisterNoDropZoneElement = React.useCallback(function unregisterNoDropZoneElement(el: HTMLElement | null) {
        setNoDropZoneElements((prev) => {
            if (el && prev.has(el)) {
                const next = new Set(prev);
                next.delete(el);
                return next;
            }
            return prev;
        });
    }, []);

    const context = React.useMemo<SortableListContextType>(
        () => ({
            draggedElementId: draggedItemId,
            hoveredElementId: hoveredItemIdAndArea?.id ?? null,
            hoveredArea: hoveredItemIdAndArea?.area ?? null,
            dragPosition,
            registerContentContainer: setContentContainerElement,
            registerScrollContainerElement: setScrollContainerElement,
            registerNoDropZoneElement: registerNoDropZoneElement,
            unregisterNoDropZoneElement: unregisterNoDropZoneElement,
            setScrollOverlayMargins: setScrollOverlayMargins,
        }),
        [draggedItemId, hoveredItemIdAndArea, dragPosition, registerNoDropZoneElement, unregisterNoDropZoneElement],
    );

    const mainRef = React.useRef<HTMLDivElement>(null);

    const scrollPosByEl = React.useRef(new WeakMap<HTMLElement, number>());

    // tracks & persists scrollTop for the current scroll container
    React.useEffect(
        function trackScrollPositionEffect() {
            const el = scrollContainerElement;
            if (!el) return;

            function handleScroll() {
                scrollPosByEl.current.set(el!, el!.scrollTop);
            }

            // restore on mount
            const saved = scrollPosByEl.current.get(el);
            if (typeof saved === "number") el.scrollTop = saved;

            el.addEventListener("scroll", handleScroll, { passive: true });
            return function cleanupTrackScrollPositionEffect() {
                el.removeEventListener("scroll", handleScroll);
            };
        },
        [scrollContainerElement],
    );

    // restores scrollTop when the container (and optionally order) changes
    React.useLayoutEffect(
        function restoreScrollPositionEffect() {
            const el = scrollContainerElement;
            if (!el) return;
            const saved = scrollPosByEl.current.get(el);
            if (typeof saved === "number") el.scrollTop = saved;
        },
        [scrollContainerElement],
    );

    // installs drag interaction listeners on the list DOM
    React.useEffect(
        function attachDragInteractionListenersEffect() {
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

                setCursor(Cursor.GRABBING);

                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };

                document.addEventListener("pointermove", handlePointerMove as EventListener);
                document.addEventListener("pointerup", handlePointerUp as EventListener, { once: true });

                e.preventDefault();
                e.stopPropagation();
            }

            function maybeScroll(position: Vec2) {
                if (currentMainRef === null) {
                    return;
                }

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                    currentScrollTime = 100;
                }

                const boundingRect = currentMainRef.getBoundingClientRect();
                const rect = {
                    top: boundingRect.top + scrollOverlayMargins.top,
                    bottom: boundingRect.bottom - scrollOverlayMargins.bottom,
                    left: boundingRect.left,
                    right: boundingRect.right,
                };

                const inTopBand =
                    position.y >= rect.top &&
                    position.y <= rect.top + AUTO_SCROLL_EDGE_PX &&
                    position.x >= rect.left &&
                    position.x <= rect.right;
                const inBottomBand =
                    position.y >= rect.bottom - AUTO_SCROLL_EDGE_PX &&
                    position.y <= rect.bottom &&
                    position.x >= rect.left &&
                    position.x <= rect.right;

                if (inTopBand) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                } else if (inBottomBand) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                } else {
                    setIsScrolling(false);
                    doScroll = false;
                }
            }

            function scrollUpRepeatedly() {
                setIsScrolling(true);
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollContainerElement) {
                    scrollContainerElement.scrollTop = Math.max(0, scrollContainerElement.scrollTop - 10);
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                }
            }

            function scrollDownRepeatedly() {
                setIsScrolling(true);
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

            function assertTargetIsNotNoDropZone(e: PointerEvent): boolean {
                for (const noDropZoneElement of noDropZoneElements) {
                    if (rectContainsPoint(noDropZoneElement.getBoundingClientRect(), vec2FromPointerEvent(e))) {
                        return false;
                    }
                }
                return true;
            }

            function getHoveredElementAndArea(e: PointerEvent): { element: HTMLElement; area: HoveredArea } | null {
                const elements = getDragElementsRecursively(currentListRef);
                for (const element of elements) {
                    if (rectContainsPoint(element.getBoundingClientRect(), vec2FromPointerEvent(e))) {
                        const type = getItemType(element);
                        if (type === ItemType.GROUP) {
                            const content = element.querySelector(
                                "[data-sortable-list-group-content]",
                            ) as HTMLElement | null;
                            if (
                                content &&
                                rectContainsPoint(content.getBoundingClientRect(), vec2FromPointerEvent(e)) &&
                                (content.querySelectorAll("[data-sortable='item']").length > 0 ||
                                    content.querySelectorAll("[data-sortable='group']").length > 0)
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
                let group = item.parentElement?.closest("[data-sortable-list-group-content]") as HTMLElement | null;
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
                    if (elm.dataset.itemId === item.dataset.itemId) {
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

                setCursor(Cursor.GRABBING);

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
                    setCursor(Cursor.GRABBING);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const mainBoundingRect = currentMainRef.getBoundingClientRect();
                if (!rectContainsPoint(mainBoundingRect, point)) {
                    // Outside of the main list area
                    setCursor(Cursor.NOT_ALLOWED);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                if (!assertTargetIsNotNoDropZone(e)) {
                    // In a no-drop zone
                    setCursor(Cursor.NOT_ALLOWED);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const hoveredElementAndArea = getHoveredElementAndArea(e);
                if (!hoveredElementAndArea) {
                    setCursor(Cursor.NOT_ALLOWED);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                if (hoveredElementAndArea.element === draggedElementInfo.element) {
                    setCursor(Cursor.NOT_ALLOWED);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                if (
                    hoveredElementAndArea.element === getItemParent(draggedElementInfo.element) &&
                    hoveredElementAndArea.area === HoveredArea.HEADER
                ) {
                    // Dragged element should not be moved into its own parent
                    setCursor(Cursor.NOT_ALLOWED);
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
                    setCursor(Cursor.GRABBING);
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
                    setCursor(Cursor.NOT_ALLOWED);
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
                    setCursor(Cursor.NOT_ALLOWED);
                    currentlyHoveredElementInfo = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                setHoveredItemIdAndArea({
                    id: hoveredElementId,
                    area: hoveredElementAndArea.area,
                });

                setCursor(Cursor.GRABBING);

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
                document.removeEventListener("pointermove", handlePointerMove);
                setCursor(Cursor.NONE);
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

                scrollTimeout && clearTimeout(scrollTimeout);
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
                document.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("blur", handleWindowBlur);
                setIsDragging(false);
                setDraggedItemId(null);
            };
        },
        [
            onItemMoved,
            isMoveAllowed,
            scrollContainerElement,
            contentContainerElement,
            noDropZoneElements,
            scrollOverlayMargins.top,
            scrollOverlayMargins.bottom,
        ],
    );

    return (
        <div className={resolveClassNames(props.className, "flex flex-col relative min-h-0 max-h-full")} ref={mainRef}>
            <SortableListContext.Provider value={context}>
                {props.children}
                <div className="h-5" />
                {(cursor !== Cursor.NONE || isDragging) &&
                    createPortal(
                        <div
                            className={resolveClassNames("absolute z-[400] inset-0", {
                                "cursor-grabbing": cursor === Cursor.GRABBING,
                                "cursor-not-allowed": cursor === Cursor.NOT_ALLOWED,
                                "cursor-n-resize": isScrolling,
                            })}
                        ></div>,
                    )}
                <DropIndicatorOverlay
                    containerEl={mainRef.current}
                    scrollEl={scrollContainerElement}
                    hovered={hoveredItemIdAndArea}
                />
                <DraggedElementPlaceholder
                    containerEl={mainRef.current}
                    scrollEl={scrollContainerElement}
                    draggedItemId={draggedItemId}
                />
                <GroupDropOverlay
                    containerEl={contentContainerElement}
                    scrollEl={scrollContainerElement}
                    hoveredId={hoveredItemIdAndArea?.id ?? null}
                    hoveredArea={hoveredItemIdAndArea?.area ?? null}
                />
            </SortableListContext.Provider>
        </div>
    );
} as SortableListCompound;

SortableList.Content = Content;
SortableList.ScrollContainer = ScrollContainer;
SortableList.Item = Item;
SortableList.Group = Group;
SortableList.NoDropZone = NoDropZone;
SortableList.GroupContent = GroupContent;
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
            const content = child.querySelector("[data-sortable-list-group-content]");
            if (content && content instanceof HTMLElement) {
                items.push(...getDragElementsRecursively(content));
            }
        }
    }
    return items;
}
