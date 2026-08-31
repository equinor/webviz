import React from "react";

import { Close, ContentCopy, DragIndicator, Edit, MoreVert } from "@mui/icons-material";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Tabs } from "@lib/components/Tabs";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DashboardTabProps = {
    dashboard: Dashboard;
    draggable: boolean;
    isHot: boolean;
    isDragged: boolean;
    dropIndicatorSide: "before" | "after" | null;
    onRequestDelete: (dashboardId: string) => void;
    onEdit: (dashboardId: string) => void;
    onDragStart: (event: React.DragEvent, dashboardId: string) => void;
    onDragOver: (event: React.DragEvent, dashboardId: string) => void;
    onDrop: (event: React.DragEvent, dashboardId: string) => void;
    onDragEnd: () => void;
    onClone: (dashboardId: string) => void;
};

export function DashboardTab(props: DashboardTabProps) {
    const { onRequestDelete, onEdit, onClone, onDragStart, onDragOver, onDrop } = props;
    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);

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

    return (
        <>
            <div className="relative w-0">
                {props.dropIndicatorSide === "before" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
            <Tooltip content={props.dashboard.getMetadata().name} side="bottom">
                <Tabs.Tab
                    as="div"
                    value={props.dashboard.getId()}
                    layoutClassName={resolveClassNames("relative flex items-center gap-x-xs snap-start", {
                        "opacity-50": props.isDragged,
                    })}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <span
                        draggable={props.draggable}
                        onDragStart={handleDragStart}
                        onDragEnd={props.onDragEnd}
                        className={resolveClassNames("flex items-center", {
                            "cursor-grab": props.draggable,
                        })}
                    >
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </span>
                    <Tooltip
                        content={
                            props.isHot
                                ? "Kept in memory - switching to this dashboard is instant"
                                : "Not kept in memory - switching to this dashboard will reload it"
                        }
                        side="top"
                    >
                        <span
                            className={resolveClassNames("h-1.5 w-1.5 shrink-0 rounded-full", {
                                "bg-success-strong": props.isHot,
                                "bg-neutral-subtle border-neutral-strong border": !props.isHot,
                            })}
                        />
                    </Tooltip>
                    <span className="truncate">{metadata.name}</span>
                    <Menu.Root>
                        <Menu.Trigger>
                            <Button iconOnly variant="ghost" size="small" onClick={(e) => e.stopPropagation()}>
                                <MoreVert />
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
                                <Menu.Item onClick={handleDeleteClick} icon={<Close />} tone="danger">
                                    Delete
                                </Menu.Item>
                            </Menu.Group>
                        </Menu.Popup>
                    </Menu.Root>
                </Tabs.Tab>
            </Tooltip>
            <div className="relative w-0">
                {props.dropIndicatorSide === "after" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
        </>
    );
}
