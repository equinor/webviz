import React from "react";

import {
    ChevronLeft,
    ChevronRight,
    ContentCopy,
    Delete,
    DragIndicator,
    Edit,
    Eject,
    MoreVert,
} from "@mui/icons-material";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { makeDashboardTabId, makeDashboardTabPanelId } from "@framework/internal/utils/dashboardAriaIds";
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Tooltip } from "@lib/components/Tooltip";
import { isDevMode } from "@lib/utils/devMode";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DashboardTabPreview } from "./dashboardTabPreview";

// Every look the name can take - bolder when active, italic when not loaded. Invisible copies in all of
// them reserve the widest, so the tab never changes width (bolder isn't always wider in this font).
const NAME_FONT_VARIANTS = [
    "font-normal not-italic",
    "font-normal italic",
    "font-bolder not-italic",
    "font-bolder italic",
] as const;

export type DashboardTabProps = {
    dashboard: Dashboard;
    draggable: boolean;
    isActive: boolean;
    /** tabIndex for the select and actions buttons - see useDashboardTabRovingFocus. */
    tabIndex: 0 | -1;
    isHot: boolean;
    isEvictable: boolean;
    isDragged: boolean;
    isSnapshot: boolean;
    previewDisabled: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    canBeDeleted: boolean;
    onSelect: (dashboardId: string) => void;
    onRequestDelete: (dashboardId: string) => void;
    onEdit: (dashboardId: string) => void;
    onDragStart: (event: React.DragEvent, dashboardId: string) => void;
    onDragOver: (event: React.DragEvent, dashboardId: string) => void;
    onDrop: (event: React.DragEvent, dashboardId: string) => void;
    onDragEnd: () => void;
    onClone: (dashboardId: string) => void;
    onForceEviction: (dashboardId: string) => void;
    onMoveLeft: (dashboardId: string) => void;
    onMoveRight: (dashboardId: string) => void;
};

export function DashboardTab(props: DashboardTabProps) {
    const {
        onSelect,
        onRequestDelete,
        onEdit,
        onClone,
        onForceEviction,
        onMoveLeft,
        onMoveRight,
        onDragStart,
        onDragOver,
        onDrop,
    } = props;
    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);

    const handleSelectClick = React.useCallback(
        function handleSelectClick() {
            onSelect(props.dashboard.getId());
        },
        [onSelect, props.dashboard],
    );

    const handleDeleteClick = React.useCallback(
        function handleDeleteClick(event: React.MouseEvent) {
            event.stopPropagation();
            onRequestDelete(props.dashboard.getId());
        },
        [onRequestDelete, props.dashboard],
    );

    const handleEditClick = React.useCallback(
        function handleEditClick(event: React.MouseEvent) {
            event.stopPropagation();
            onEdit(props.dashboard.getId());
        },
        [onEdit, props.dashboard],
    );

    const handleCloneClick = React.useCallback(
        function handleCloneClick(event: React.MouseEvent) {
            event.stopPropagation();
            onClone(props.dashboard.getId());
        },
        [onClone, props.dashboard],
    );

    const handleDragStart = React.useCallback(
        function handleDragStart(event: React.DragEvent) {
            onDragStart(event, props.dashboard.getId());
        },
        [onDragStart, props.dashboard],
    );

    const handleDragOver = React.useCallback(
        function handleDragOver(event: React.DragEvent) {
            onDragOver(event, props.dashboard.getId());
        },
        [onDragOver, props.dashboard],
    );

    const handleDrop = React.useCallback(
        function handleDrop(event: React.DragEvent) {
            onDrop(event, props.dashboard.getId());
        },
        [onDrop, props.dashboard],
    );

    const handleForceEviction = React.useCallback(
        function handleForceEviction(event: React.MouseEvent) {
            event.stopPropagation();
            onForceEviction(props.dashboard.getId());
        },
        [onForceEviction, props.dashboard],
    );

    const handleMoveLeftClick = React.useCallback(
        function handleMoveLeftClick(event: React.MouseEvent) {
            event.stopPropagation();
            onMoveLeft(props.dashboard.getId());
        },
        [onMoveLeft, props.dashboard],
    );

    const handleMoveRightClick = React.useCallback(
        function handleMoveRightClick(event: React.MouseEvent) {
            event.stopPropagation();
            onMoveRight(props.dashboard.getId());
        },
        [onMoveRight, props.dashboard],
    );

    return (
        <>
            <div
                className={resolveClassNames("px-xs relative flex snap-start items-center rounded-b border-t-2", {
                    "opacity-50": props.isDragged,
                    "bg-surface shadow-elevation-raised font-bolder border-t-accent-strong": props.isActive,
                    "hover:bg-accent border-t-transparent": !props.isActive,
                })}
                // The scroll-step item - must be the same element that carries snap-start
                data-dashboard-tab-item
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {!props.isSnapshot && (
                    <span
                        draggable={props.draggable}
                        onDragStart={handleDragStart}
                        onDragEnd={props.onDragEnd}
                        className={resolveClassNames("pl-xs relative z-10 flex items-center", {
                            "cursor-grab": props.draggable,
                        })}
                    >
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </span>
                )}
                <DashboardTabPreview
                    dashboard={props.dashboard}
                    disabled={props.previewDisabled}
                    triggerId={makeDashboardTabId(props.dashboard.getId())}
                >
                    <button
                        data-dashboard-tab={props.dashboard.getId()}
                        id={makeDashboardTabId(props.dashboard.getId())}
                        role="tab"
                        tabIndex={props.tabIndex}
                        aria-selected={props.isActive}
                        // Only keep-alive (hot) dashboards have a mounted tabpanel to point to
                        aria-controls={props.isHot ? makeDashboardTabPanelId(props.dashboard.getId()) : undefined}
                        onClick={handleSelectClick}
                        // The ::after overlay stretches the click target over the whole tab, including its padding
                        className={resolveClassNames(
                            "gap-x-xs py-2xs px-xs flex cursor-pointer items-center after:absolute after:inset-0 after:rounded",
                            {
                                // Not loaded - opening it takes longer. Italic rather than dimmed, to keep the contrast
                                italic: !props.isHot,
                            },
                        )}
                    >
                        <span className="grid">
                            <span className="col-start-1 row-start-1">{metadata.name}</span>
                            {NAME_FONT_VARIANTS.map((variant) => (
                                <span
                                    key={variant}
                                    aria-hidden
                                    className={`${variant} invisible col-start-1 row-start-1`}
                                >
                                    {metadata.name}
                                </span>
                            ))}
                        </span>
                    </button>
                </DashboardTabPreview>
                {!props.isSnapshot && (
                    <span className="relative z-10 flex">
                        <Menu.Root>
                            <Menu.Trigger>
                                <Button
                                    aria-label={`Open actions for ${metadata.name}`}
                                    // Only the current tab's actions are in the tab order, keeping the strip at two tab stops
                                    tabIndex={props.tabIndex}
                                    iconOnly
                                    variant="ghost"
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVert style={{ fontSize: 16 }} />
                                </Button>
                            </Menu.Trigger>
                            <Menu.Popup>
                                <Menu.Group>
                                    <Menu.GroupLabel>{metadata.name}</Menu.GroupLabel>
                                    <Menu.Item onClick={handleEditClick} icon={<Edit />}>
                                        Edit metadata
                                    </Menu.Item>
                                    <Menu.Item onClick={handleCloneClick} icon={<ContentCopy />}>
                                        Create a copy
                                    </Menu.Item>
                                    <Menu.Separator />
                                    <Menu.Item
                                        onClick={handleMoveLeftClick}
                                        icon={<ChevronLeft />}
                                        disabled={!props.canMoveLeft}
                                    >
                                        Move left
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={handleMoveRightClick}
                                        icon={<ChevronRight />}
                                        disabled={!props.canMoveRight}
                                    >
                                        Move right
                                    </Menu.Item>
                                    <Menu.Separator />
                                    <Tooltip
                                        content="You cannot delete the last dashboard"
                                        disabled={props.canBeDeleted}
                                    >
                                        <Menu.Item
                                            onClick={handleDeleteClick}
                                            icon={<Delete />}
                                            tone="danger"
                                            disabled={!props.canBeDeleted}
                                        >
                                            Delete
                                        </Menu.Item>
                                    </Tooltip>
                                    {isDevMode() && (
                                        <>
                                            <Menu.Separator />
                                            <Menu.Item
                                                onClick={handleForceEviction}
                                                icon={<Eject />}
                                                disabled={!props.isEvictable}
                                            >
                                                Force eviction
                                            </Menu.Item>
                                        </>
                                    )}
                                </Menu.Group>
                            </Menu.Popup>
                        </Menu.Root>
                    </span>
                )}
            </div>
        </>
    );
}
