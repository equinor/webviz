import React from "react";

import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

import type { IsMoveAllowed } from "./moveRules";
import { isMoveValid, moveItems } from "./moveRules";
import type { InsertTarget, ItemRow, TreeRow } from "./treeModel";
import { ROW_HEIGHT_PX, getGroupOwner } from "./treeModel";

const DRAG_THRESHOLD_PX = 4;
const AUTO_SCROLL_ZONE_PX = 28;

export type DropTarget = {
    insert: InsertTarget;
    isValid: boolean;
    rowIndex: number;
    mode: "before" | "after" | "into";
    depth: number;
};

export type DragState = {
    items: Item[];
    clientX: number;
    clientY: number;
    target: DropTarget | null;
};

export type UseTreeDragAndDropArgs = {
    rows: TreeRow[];
    manager: DataProviderManager;
    contentElement: HTMLElement | null;
    scrollElement: HTMLElement | null;
    getDraggedItems: (row: ItemRow) => Item[];
    isMoveAllowed?: IsMoveAllowed;
};

export type UseTreeDragAndDropResult = {
    dragState: DragState | null;
    handlePointerDown: (event: React.PointerEvent, row: ItemRow) => void;
    /** True right after a drag ended, so the click that follows the pointer up can be ignored */
    wasDragging: () => boolean;
};

export function useTreeDragAndDrop(args: UseTreeDragAndDropArgs): UseTreeDragAndDropResult {
    const [dragState, setDragState] = React.useState<DragState | null>(null);
    const wasDraggingRef = React.useRef(false);

    // The pointer handlers live for the whole drag, so they read the latest values through a ref
    const argsRef = React.useRef(args);
    argsRef.current = args;

    function computeDropTarget(clientX: number, clientY: number, items: Item[]): DropTarget | null {
        const { rows, manager, contentElement, isMoveAllowed } = argsRef.current;
        if (!contentElement) {
            return null;
        }
        const rect = contentElement.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right) {
            return null;
        }
        const y = clientY - rect.top;
        const rowIndex = Math.floor(y / ROW_HEIGHT_PX);
        const row = rows[rowIndex];
        if (!row) {
            return null;
        }
        const relativeY = (y - rowIndex * ROW_HEIGHT_PX) / ROW_HEIGHT_PX;

        let insert: InsertTarget;
        let mode: DropTarget["mode"];
        const depth = row.depth;

        if (row.type === "add") {
            insert = row.target;
            mode = "before";
        } else if (row.type === "section") {
            insert = row.firstPositionTarget;
            mode = "after";
        } else if (row.isContainer && relativeY > 0.3 && relativeY < 0.7) {
            const group = row.item as ItemGroup;
            insert = { group, index: group.getGroupDelegate().getChildren().length, sectionId: null };
            mode = "into";
        } else {
            const parent = row.item.getItemDelegate().getParentGroup();
            const owner = parent ? getGroupOwner(parent, manager) : null;
            if (!parent || !owner) {
                return null;
            }
            const isAfter = relativeY >= 0.5;
            insert = {
                group: owner,
                index: parent.getChildren().indexOf(row.item) + (isAfter ? 1 : 0),
                sectionId: owner === manager ? row.sectionId : null,
            };
            mode = isAfter ? "after" : "before";
        }

        return { insert, isValid: isMoveValid(items, insert, isMoveAllowed), rowIndex, mode, depth };
    }

    function handlePointerDown(event: React.PointerEvent, row: ItemRow) {
        if (event.button !== 0) {
            return;
        }

        const startX = event.clientX;
        const startY = event.clientY;
        const items = argsRef.current.getDraggedItems(row);
        let isDragging = false;
        let currentTarget: DropTarget | null = null;
        let autoScrollTimer: ReturnType<typeof setInterval> | null = null;

        function stopAutoScroll() {
            if (autoScrollTimer) {
                clearInterval(autoScrollTimer);
                autoScrollTimer = null;
            }
        }

        function updateAutoScroll(clientY: number) {
            stopAutoScroll();
            const scrollElement = argsRef.current.scrollElement;
            if (!scrollElement) {
                return;
            }
            const rect = scrollElement.getBoundingClientRect();
            let delta = 0;
            if (clientY < rect.top + AUTO_SCROLL_ZONE_PX) {
                delta = -(AUTO_SCROLL_ZONE_PX - (clientY - rect.top)) / 4;
            } else if (clientY > rect.bottom - AUTO_SCROLL_ZONE_PX) {
                delta = (AUTO_SCROLL_ZONE_PX - (rect.bottom - clientY)) / 4;
            }
            if (delta !== 0) {
                autoScrollTimer = setInterval(() => {
                    scrollElement.scrollTop += delta;
                }, 16);
            }
        }

        function handlePointerMove(moveEvent: PointerEvent) {
            if (!isDragging) {
                if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < DRAG_THRESHOLD_PX) {
                    return;
                }
                isDragging = true;
                wasDraggingRef.current = true;
            }
            currentTarget = computeDropTarget(moveEvent.clientX, moveEvent.clientY, items);
            setDragState({ items, clientX: moveEvent.clientX, clientY: moveEvent.clientY, target: currentTarget });
            updateAutoScroll(moveEvent.clientY);
        }

        function handlePointerUp() {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            stopAutoScroll();
            if (isDragging && currentTarget?.isValid) {
                moveItems(items, currentTarget.insert);
            }
            setDragState(null);
            // The click event fires right after pointerup - reset once it has been handled
            setTimeout(() => {
                wasDraggingRef.current = false;
            });
        }

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);
    }

    return {
        dragState,
        handlePointerDown,
        wasDragging: () => wasDraggingRef.current,
    };
}
