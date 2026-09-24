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
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Tooltip } from "@lib/components/Tooltip";
import { isDevMode } from "@lib/utils/devMode";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DashboardTabPreview } from "./dashboardTabPreview";

export type DashboardTabProps = {
    dashboard: Dashboard;
    draggable: boolean;
    isActive: boolean;
    /** tabIndex for the select button - see useDashboardTabRovingFocus. */
    tabIndex: 0 | -1;
    isHot: boolean;
    isEvictable: boolean;
    isDragged: boolean;
    isSnapshot: boolean;
    previewDisabled: boolean;
    dropIndicatorSide: "before" | "after" | null;
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
            <div className="relative w-0">
                {props.dropIndicatorSide === "before" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
            {/*
                Every interactive piece (drag handle, select button, actions menu) is a normal flex
                sibling in document flow here - deliberately not nested inside a single ARIA "tab"
                element. The ARIA Authoring Practices Guide's own Tabs pattern requires a tab's action
                button to be a DOM sibling rather than a descendant (a tab can't contain other
                focusable widgets), and that restriction kept compounding: it forced the actions menu
                out as an absolutely-positioned sibling, which in turn broke hover-state composition
                (hovering the menu no longer kept the row's own hover background) and caused the menu
                button to visibly jump when keyboard focus landed on the tab. Using plain flow layout
                for every child sidesteps all of that by construction - nothing needs to coordinate
                position with anything else, and hovering any child keeps :hover active on this row
                since it's a real ancestor of whatever's hovered.
            */}
            <div
                className={resolveClassNames("gap-x-xs hover:bg-accent-hover relative flex snap-start items-center", {
                    "opacity-50": props.isDragged,
                })}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {!props.isSnapshot && (
                    <span
                        draggable={props.draggable}
                        onDragStart={handleDragStart}
                        onDragEnd={props.onDragEnd}
                        className={resolveClassNames("pl-xs flex items-center", {
                            "cursor-grab": props.draggable,
                        })}
                    >
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </span>
                )}
                <DashboardTabPreview dashboard={props.dashboard} disabled={props.previewDisabled}>
                    <button
                        data-dashboard-tab={props.dashboard.getId()}
                        tabIndex={props.tabIndex}
                        aria-current={props.isActive ? "true" : undefined}
                        onClick={handleSelectClick}
                        className="gap-x-xs flex items-center"
                    >
                        <span
                            className={resolveClassNames(
                                "bg-neutral border-neutral h-1.5 w-1.5 shrink-0 rounded-full border",
                                {
                                    "bg-accent-strong! border-accent-strong!": props.isHot,
                                },
                            )}
                        >
                            <span className="sr-only">{props.isHot ? "Recently viewed. " : ""}</span>
                        </span>
                        {metadata.name}
                    </button>
                </DashboardTabPreview>
                {!props.isSnapshot && (
                    <Menu.Root>
                        <Menu.Trigger>
                            <Button
                                aria-label={`Open actions for ${metadata.name}`}
                                iconOnly
                                variant="ghost"
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                                layoutClassName="mr-3xs"
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
                                <Tooltip content="You cannot delete the last dashboard" disabled={props.canBeDeleted}>
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
                )}
            </div>
            <div className="relative w-0">
                {props.dropIndicatorSide === "after" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
        </>
    );
}
