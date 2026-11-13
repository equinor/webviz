import React from "react";

import { Close } from "@mui/icons-material";

import type { DataProviderFrameworkSettingsPlacement } from "@framework/GuiMessageBroker";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Item } from "../../interfacesAndTypes/entities";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

import type { GroupActions, OnAction } from "./addItem";
import { makeAddMenuItems, runAddAction } from "./addItem";
import { FloatingSettingsFlyout } from "./FloatingSettingsFlyout";
import { HistoryNavigationButtons } from "./HistoryNavigationButtons";
import type { IsMoveAllowed } from "./moveRules";
import { Rails } from "./Rails";
import { SettingsPanel } from "./SettingsPanel";
import { StickyHeaders } from "./StickyHeaders";
import type { AddRow, ItemRow } from "./treeModel";
import { ROW_HEIGHT_PX, getGutterWidth, isSelectable } from "./treeModel";
import { AddRowView, ItemRowView, SectionRowView } from "./TreeRowViews";
import { useSelectionHistory } from "./useSelectionHistory";
import { useTreeDragAndDrop } from "./useTreeDragAndDrop";
import { useTreeModel } from "./useTreeModel";

const INDENT_PX = 16;
const DEFAULT_PANEL_HEIGHT_PX = 260;
const DEFAULT_PANEL_WIDTH_PERCENT = 50;
const MIN_SECTION_HEIGHT_PX = 80;
const MIN_SECTION_WIDTH_PX = 120;
const TREE_BOTTOM_PADDING_PX = 40;

export type TreeInspectorComponentProps = {
    dataProviderManager: DataProviderManager;
    groupActions: GroupActions;
    onAction: OnAction;
    isMoveAllowed?: IsMoveAllowed;
    settingsPlacement: DataProviderFrameworkSettingsPlacement;
};

export function TreeInspectorComponent(props: TreeInspectorComponentProps): React.ReactNode {
    const { dataProviderManager: manager, groupActions, onAction } = props;
    const { rows, relations, railLayout } = useTreeModel(manager);

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [anchorId, setAnchorId] = React.useState<string | null>(null);
    const [pinnedIds, setPinnedIds] = React.useState<string[]>([]);
    const history = useSelectionHistory(relations.itemsById);

    // Pins of removed items drop out, as they are no longer in the tree
    const pinnedItems = React.useMemo(
        () => pinnedIds.map((id) => relations.itemsById.get(id)).filter((item): item is Item => item !== undefined),
        [pinnedIds, relations],
    );

    function togglePin(item: Item) {
        const id = item.getItemDelegate().getId();
        setPinnedIds((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]));
    }

    /** A selection made by the user - recorded in the history (which skips empty selections). */
    function changeSelection(ids: string[], anchor: string | null) {
        setSelectedIds(ids);
        setAnchorId(anchor);
        history.record(ids);
    }

    function navigateHistory(direction: "back" | "forward") {
        const ids = direction === "back" ? history.goBack() : history.goForward();
        if (ids) {
            setSelectedIds(ids);
            setAnchorId(ids[0]);
        }
    }

    function handleHistoryKeyDown(event: React.KeyboardEvent) {
        if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
            return;
        }
        event.preventDefault();
        navigateHistory(event.key === "ArrowLeft" ? "back" : "forward");
    }

    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [panelHeight, setPanelHeight] = React.useState(DEFAULT_PANEL_HEIGHT_PX);
    const [panelWidthPercent, setPanelWidthPercent] = React.useState(DEFAULT_PANEL_WIDTH_PERCENT);
    const isBeside = props.settingsPlacement === "beside";
    const isFloating = props.settingsPlacement === "floating";
    const isPointerDownInsideRef = React.useRef(false);
    const [scrollElement, setScrollElement] = React.useState<HTMLDivElement | null>(null);
    const [contentElement, setContentElement] = React.useState<HTMLDivElement | null>(null);
    const [containerElement, setContainerElement] = React.useState<HTMLDivElement | null>(null);

    const gutterWidth = getGutterWidth(railLayout.numLanes);

    // Removed items drop out of the selection, as they are no longer in the tree
    const selectedItems = React.useMemo(
        () => selectedIds.map((id) => relations.itemsById.get(id)).filter((item): item is Item => item !== undefined),
        [selectedIds, relations],
    );
    const selectedIdSet = React.useMemo(
        () => new Set(selectedItems.map((item) => item.getItemDelegate().getId())),
        [selectedItems],
    );

    const { hotSourceIds, hotItemIds } = React.useMemo(() => {
        const sources = new Set<string>();
        if (hoveredId) {
            if (relations.controlledItemIdsBySourceId.has(hoveredId)) {
                sources.add(hoveredId);
            } else {
                relations.sourceIdsByItemId.get(hoveredId)?.forEach((id) => sources.add(id));
            }
        }
        const items = new Set<string>(sources);
        for (const sourceId of sources) {
            relations.controlledItemIdsBySourceId.get(sourceId)?.forEach((id) => items.add(id));
        }
        return { hotSourceIds: sources, hotItemIds: items };
    }, [hoveredId, relations]);

    const selectableRowKeys = React.useMemo(
        () => rows.filter((row): row is ItemRow => row.type === "item" && isSelectable(row.item)).map((row) => row.key),
        [rows],
    );

    const { dragState, handlePointerDown, wasDragging } = useTreeDragAndDrop({
        rows,
        manager,
        contentElement,
        scrollElement,
        isMoveAllowed: props.isMoveAllowed,
        getDraggedItems(row) {
            if (!selectedIdSet.has(row.key)) {
                return [row.item];
            }
            return rows
                .filter((other): other is ItemRow => other.type === "item" && selectedIdSet.has(other.key))
                .map((other) => other.item);
        },
    });
    const draggedItems = React.useMemo(() => new Set(dragState?.items ?? []), [dragState]);

    function handleRowClick(event: React.MouseEvent, row: ItemRow) {
        // Handled here - clicks reaching the tree background close the floating settings
        event.stopPropagation();
        if (wasDragging()) {
            return;
        }
        if (!isSelectable(row.item)) {
            if (isFloating) {
                clearSelection();
            }
            return;
        }
        scrollElement?.focus({ preventScroll: true });

        const id = row.key;
        const isModifierClick = event.ctrlKey || event.metaKey || event.shiftKey;
        if (isFloating && !isModifierClick && selectedIds.length === 1 && selectedIds[0] === id) {
            clearSelection();
            return;
        }
        if (event.ctrlKey || event.metaKey) {
            const ids = selectedIds.includes(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id];
            changeSelection(ids, id);
            return;
        }
        if (event.shiftKey && anchorId && selectableRowKeys.includes(anchorId)) {
            const from = selectableRowKeys.indexOf(anchorId);
            const to = selectableRowKeys.indexOf(id);
            changeSelection(selectableRowKeys.slice(Math.min(from, to), Math.max(from, to) + 1), anchorId);
            return;
        }
        changeSelection([id], id);
    }

    function clearSelection() {
        setSelectedIds([]);
        setAnchorId(null);
    }

    const [pendingRevealId, setPendingRevealId] = React.useState<string | null>(null);

    /** Selects the item, expanding collapsed ancestors and scrolling it into view - used by the source chips. */
    function selectAndReveal(itemId: string) {
        const item = relations.itemsById.get(itemId);
        if (!item) {
            return;
        }
        const parent = item.getItemDelegate().getParentGroup();
        for (const ancestor of parent?.getAncestors(() => true) ?? []) {
            ancestor.getItemDelegate().setExpanded(true);
        }
        changeSelection([itemId], itemId);
        setPendingRevealId(itemId);
    }

    React.useEffect(
        function scrollRevealedItemIntoView() {
            if (!pendingRevealId || !scrollElement) {
                return;
            }
            const rowIndex = rows.findIndex((row) => row.type === "item" && row.key === pendingRevealId);
            if (rowIndex === -1) {
                // The rows for the expanded ancestors are not there yet
                return;
            }
            const rowTop = rowIndex * ROW_HEIGHT_PX;
            const isInView =
                rowTop >= scrollElement.scrollTop &&
                rowTop + ROW_HEIGHT_PX <= scrollElement.scrollTop + scrollElement.clientHeight;
            if (!isInView) {
                scrollElement.scrollTo({ top: rowTop - scrollElement.clientHeight / 3 });
            }
            // eslint-disable-next-line @eslint-react/set-state-in-effect -- the reveal is done once the row exists
            setPendingRevealId(null);
        },
        [pendingRevealId, rows, scrollElement],
    );

    // Rows and add rows stop their clicks, so only clicks on empty space and section headers get here
    function handleTreeBackgroundClick() {
        if (isFloating && !wasDragging()) {
            clearSelection();
        }
    }

    function handleKeyDown(event: React.KeyboardEvent) {
        if (event.key === "Escape") {
            clearSelection();
        }
    }

    function markPointerDownInside() {
        isPointerDownInsideRef.current = true;
    }

    const hasSelection = selectedItems.length > 0;
    React.useEffect(
        function clearSelectionOnPointerDownOutside() {
            if (!isFloating || !hasSelection) {
                return;
            }
            /*
             * This capturing listener runs before React's handlers. Pointer downs in the tree or the flyout - including
             * portaled dropdowns and menus opened from them, as React events bubble along the component tree - mark
             * themselves as inside, so the check waits until the event has been handled.
             */
            let pendingCheck: ReturnType<typeof setTimeout> | null = null;
            function handleDocumentPointerDown() {
                isPointerDownInsideRef.current = false;
                if (pendingCheck) {
                    clearTimeout(pendingCheck);
                }
                pendingCheck = setTimeout(() => {
                    pendingCheck = null;
                    if (!isPointerDownInsideRef.current) {
                        setSelectedIds([]);
                        setAnchorId(null);
                    }
                });
            }
            document.addEventListener("pointerdown", handleDocumentPointerDown, true);
            return () => {
                document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
                if (pendingCheck) {
                    clearTimeout(pendingCheck);
                }
            };
        },
        [isFloating, hasSelection],
    );

    const anchorRowKey = rows.find((row) => row.type === "item" && selectedIdSet.has(row.key))?.key ?? null;

    function handleSelectControlled(source: Item) {
        const controlledIds = relations.controlledItemIdsBySourceId.get(source.getItemDelegate().getId()) ?? new Set();
        const ids = [...controlledIds].filter((id) => {
            const item = relations.itemsById.get(id);
            return item !== undefined && isSelectable(item);
        });
        changeSelection(ids, ids[0] ?? null);
    }

    function handleAddActionClicked(identifier: string, row: AddRow) {
        runAddAction(identifier, row.target, onAction);
    }

    function handleDividerPointerDown(event: React.PointerEvent) {
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const startHeight = panelHeight;
        const startWidthPercent = panelWidthPercent;
        const containerHeight = containerElement?.clientHeight ?? 0;
        const containerWidth = containerElement?.clientWidth ?? 0;

        function handlePointerMove(moveEvent: PointerEvent) {
            if (isBeside) {
                if (containerWidth === 0) {
                    return;
                }
                const width = (startWidthPercent / 100) * containerWidth - (moveEvent.clientX - startX);
                const maxWidth = Math.max(MIN_SECTION_WIDTH_PX, containerWidth - MIN_SECTION_WIDTH_PX);
                const clampedWidth = Math.min(Math.max(width, MIN_SECTION_WIDTH_PX), maxWidth);
                setPanelWidthPercent((clampedWidth / containerWidth) * 100);
                return;
            }
            const height = startHeight - (moveEvent.clientY - startY);
            const maxHeight = Math.max(MIN_SECTION_HEIGHT_PX, containerHeight - MIN_SECTION_HEIGHT_PX);
            setPanelHeight(Math.min(Math.max(height, MIN_SECTION_HEIGHT_PX), maxHeight));
        }
        function handlePointerUp() {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        }
        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);
    }

    const dropTarget = dragState?.target ?? null;

    const historyNavigation = (
        <HistoryNavigationButtons
            backTarget={history.backTarget}
            forwardTarget={history.forwardTarget}
            itemsById={relations.itemsById}
            onBack={() => navigateHistory("back")}
            onForward={() => navigateHistory("forward")}
        />
    );

    return (
        <div
            ref={setContainerElement}
            className={resolveClassNames("bg-canvas flex min-h-0 grow", isBeside ? "flex-row" : "flex-col")}
            onPointerDownCapture={markPointerDownInside}
            // Also receives key presses in the floating settings, as React events bubble through portals
            onKeyDown={handleHistoryKeyDown}
        >
            <div className="relative min-h-0 min-w-0 grow">
                <div
                    ref={setScrollElement}
                    className="absolute inset-0 overflow-auto outline-none"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={handleTreeBackgroundClick}
                >
                    <div ref={setContentElement} className="relative" style={{ height: rows.length * ROW_HEIGHT_PX }}>
                        <Rails
                            rails={railLayout.rails}
                            width={gutterWidth}
                            hotSourceIds={hotSourceIds}
                            itemsById={relations.itemsById}
                            onHoverChange={setHoveredId}
                            onRailClick={(rail) =>
                                scrollElement?.scrollTo({ top: rail.sourceRowIndex * ROW_HEIGHT_PX })
                            }
                        />
                        <div style={{ marginLeft: gutterWidth }}>
                            {rows.map((row, rowIndex) => {
                                if (row.type === "section") {
                                    return <SectionRowView key={row.key} row={row} />;
                                }
                                if (row.type === "add") {
                                    return (
                                        <AddRowView
                                            key={row.key}
                                            row={row}
                                            menuItems={makeAddMenuItems(groupActions, row.target)}
                                            onActionClicked={handleAddActionClicked}
                                        />
                                    );
                                }
                                const isDropInto = dropTarget?.mode === "into" && dropTarget.rowIndex === rowIndex;
                                return (
                                    <ItemRowView
                                        key={row.key}
                                        row={row}
                                        isSelected={selectedIdSet.has(row.key)}
                                        isHot={hotItemIds.has(row.key)}
                                        isDragged={draggedItems.has(row.item)}
                                        isDropInto={isDropInto}
                                        isDropIntoValid={dropTarget?.isValid ?? false}
                                        sourceColor={railLayout.railsBySourceId.get(row.key)?.color ?? null}
                                        hasControlledItems={relations.controlledItemIdsBySourceId.has(row.key)}
                                        onPointerDown={handlePointerDown}
                                        onClick={handleRowClick}
                                        onHoverChange={setHoveredId}
                                        onSelectControlled={handleSelectControlled}
                                    />
                                );
                            })}
                        </div>
                        {dropTarget && dropTarget.mode !== "into" && (
                            <div
                                className={resolveClassNames("pointer-events-none absolute right-0 z-30 h-0.5", {
                                    "bg-accent-strong": dropTarget.isValid,
                                    "bg-danger-strong": !dropTarget.isValid,
                                })}
                                style={{
                                    left: gutterWidth + dropTarget.depth * INDENT_PX,
                                    top:
                                        (dropTarget.mode === "before" ? dropTarget.rowIndex : dropTarget.rowIndex + 1) *
                                            ROW_HEIGHT_PX -
                                        1,
                                }}
                            />
                        )}
                    </div>
                    <div style={{ height: TREE_BOTTOM_PADDING_PX }} />
                </div>
                <StickyHeaders
                    rows={rows}
                    railLayout={railLayout}
                    scrollContainer={scrollElement}
                    gutterWidth={gutterWidth}
                    hotSourceIds={hotSourceIds}
                    onHoverChange={setHoveredId}
                />
            </div>
            {isFloating ? (
                (anchorRowKey || pinnedItems.length > 0) && (
                    <FloatingSettingsFlyout
                        anchorRowKey={anchorRowKey}
                        sidebarElement={containerElement}
                        scrollElement={scrollElement}
                        contentElement={contentElement}
                        layoutRevision={rows}
                        onClose={clearSelection}
                        onPointerDownCapture={markPointerDownInside}
                    >
                        <SettingsPanel
                            manager={manager}
                            selectedItems={selectedItems}
                            pinnedItems={pinnedItems}
                            onTogglePin={togglePin}
                            relations={relations}
                            onHoverChange={setHoveredId}
                            onSourceClick={selectAndReveal}
                            navigation={historyNavigation}
                            headerAdornment={
                                <Button
                                    variant="ghost"
                                    tone="neutral"
                                    size="small"
                                    iconOnly
                                    aria-label="Close settings"
                                    onClick={clearSelection}
                                >
                                    <Close fontSize="inherit" />
                                </Button>
                            }
                        />
                    </FloatingSettingsFlyout>
                )
            ) : (
                <>
                    <div
                        role="separator"
                        aria-orientation={isBeside ? "vertical" : "horizontal"}
                        className={resolveClassNames(
                            "bg-neutral border-neutral-subtle relative shrink-0",
                            isBeside ? "w-2 cursor-col-resize border-x" : "h-2 cursor-row-resize border-y",
                        )}
                        onPointerDown={handleDividerPointerDown}
                    >
                        <div
                            className={resolveClassNames(
                                "bg-neutral-strong absolute rounded-sm",
                                isBeside
                                    ? "top-1/2 left-[2px] h-8 w-0.5 -translate-y-1/2"
                                    : "top-[2px] left-1/2 h-0.5 w-8 -translate-x-1/2",
                            )}
                        />
                    </div>
                    <div
                        className="min-h-0 shrink-0 overflow-auto"
                        style={isBeside ? { width: `${panelWidthPercent}%` } : { height: panelHeight }}
                    >
                        <SettingsPanel
                            manager={manager}
                            selectedItems={selectedItems}
                            pinnedItems={pinnedItems}
                            onTogglePin={togglePin}
                            relations={relations}
                            onHoverChange={setHoveredId}
                            onSourceClick={selectAndReveal}
                            navigation={historyNavigation}
                        />
                    </div>
                </>
            )}
            {dragState && (
                <div
                    className="bg-surface border-neutral text-body-sm pointer-events-none fixed z-[1000] rounded border px-2 py-0.5 shadow-md"
                    style={{ left: dragState.clientX + 12, top: dragState.clientY + 8 }}
                >
                    {dragState.items[0].getItemDelegate().getName()}
                    {dragState.items.length > 1 && (
                        <span className="bg-accent-strong ml-1.5 rounded-full px-1.5 text-[10px] text-white">
                            {dragState.items.length}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
