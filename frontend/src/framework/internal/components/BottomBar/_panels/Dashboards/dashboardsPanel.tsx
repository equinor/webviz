import React from "react";

import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Tabs } from "@lib/components/Tabs";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveSession } from "../../../ActiveSessionBoundary";

import {
    CannotRemoveLastDashboardDialog,
    ConfirmDeleteDashboardDialog,
    DashboardDragImage,
    DashboardTab,
    EditDashboardMetadataDialog,
} from "./_components";
import { useDashboardReorder, useDashboardTabStripScroll, useOptimisticActiveDashboard } from "./_hooks";

export type DashboardsPanelProps = {
    workbench: Workbench;
};

export function DashboardsPanel(props: DashboardsPanelProps) {
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    const dashboards = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.DASHBOARDS);
    const activeDashboard = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const hotDashboardIds = usePublishSubscribeTopicValue(
        workbenchSession.getDashboardHotCache(),
        DashboardHotCacheTopic.HOT_DASHBOARD_IDS,
    );

    const [editingDashboard, setEditingDashboard] = React.useState<Dashboard | null>(null);
    const [dashboardPendingDeleteConfirmation, setDashboardPendingDeleteConfirmation] =
        React.useState<Dashboard | null>(null);
    const [showCannotRemoveDashboardDialog, setShowCannotRemoveDashboardDialog] = React.useState<boolean>(false);

    const tabStripScroll = useDashboardTabStripScroll(dashboards);
    const reorder = useDashboardReorder(dashboards, workbenchSession);
    const { optimisticActiveDashboardId, selectDashboard } = useOptimisticActiveDashboard(
        props.workbench,
        workbenchSession,
    );

    const handleAddDashboardClick = React.useCallback(
        function handleAddDashboardClick() {
            workbenchSession.addDashboard();
        },
        [workbenchSession],
    );

    const handleEditDashboardClick = React.useCallback(
        function handleEditDashboardClick(dashboardId: string) {
            setEditingDashboard(dashboards.find((d) => d.getId() === dashboardId) || null);
        },
        [dashboards],
    );

    const handleRemoveDashboardClick = React.useCallback(
        function handleRemoveDashboardClick(dashboardId: string) {
            workbenchSession.removeDashboard(dashboardId);
        },
        [workbenchSession],
    );

    const handleRequestDeleteDashboard = React.useCallback(
        function handleRequestDeleteDashboard(dashboardId: string) {
            const dashboard = dashboards.find((d) => d.getId() === dashboardId);
            if (!dashboard) {
                console.debug(`Dashboard with id ${dashboardId} not found`);
                return;
            }
            if (dashboards.length === 1) {
                setShowCannotRemoveDashboardDialog(true);
                return;
            }
            if (dashboard.getModuleInstances().length === 0) {
                handleRemoveDashboardClick(dashboard.getId());
                return;
            }
            setDashboardPendingDeleteConfirmation(dashboard);
        },
        [dashboards, handleRemoveDashboardClick],
    );

    const handleCloneDashboardClick = React.useCallback(
        function handleCloneDashboardClick(dashboardId: string) {
            workbenchSession.cloneDashboard(dashboardId);
        },
        [workbenchSession],
    );

    const handleForceEvictionClick = React.useCallback(
        function handleForceEvictionClick(dashboardId: string) {
            workbenchSession.getDashboardHotCache().evictNow(dashboardId);
        },
        [workbenchSession],
    );

    return (
        <div className="gap-xs -mt-[2px] flex w-full items-center">
            <div className="gap-3xs flex min-w-0 items-center">
                <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!tabStripScroll.canScrollToPrevious}
                    onClick={tabStripScroll.scrollToPrevious}
                    layoutClassName={tabStripScroll.canScrollToPrevious ? "" : "invisible"}
                >
                    <ChevronLeft fontSize="small" />
                </Button>
                <div
                    ref={tabStripScroll.scrollContainerRef}
                    className={resolveClassNames(
                        "px-xs min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                        {
                            // Only snap while the strip can actually scroll. With scroll-snap-type
                            // mandatory always on, removing a dashboard so the remaining tabs fit
                            // without scrolling left the browser's own snap-correction machinery
                            // fighting to "settle" scrollLeft (observed via logging: it oscillated
                            // between the old scroll position and 0 over ~150-200ms) - there's
                            // nothing to snap between once everything already fits, so there's
                            // nothing left to correct.
                            "snap-x snap-mandatory":
                                tabStripScroll.canScrollToPrevious || tabStripScroll.canScrollToNext,
                        },
                    )}
                >
                    <Tabs.Root
                        ref={tabStripScroll.contentRef}
                        onValueChange={selectDashboard}
                        value={optimisticActiveDashboardId ?? activeDashboard?.getId() ?? ""}
                        layoutClassName="w-max"
                    >
                        <Tabs.List size="small" indicatorPosition="start">
                            {dashboards.map((dashboard) => (
                                <DashboardTab
                                    key={dashboard.getId()}
                                    dashboard={dashboard}
                                    draggable={!isSnapshot}
                                    isHot={
                                        dashboard.getId() === activeDashboard?.getId() ||
                                        hotDashboardIds.includes(dashboard.getId())
                                    }
                                    isDragged={reorder.draggedDashboardId === dashboard.getId()}
                                    previewDisabled={reorder.draggedDashboardId !== null}
                                    dropIndicatorSide={
                                        reorder.dropTarget?.dashboardId === dashboard.getId()
                                            ? reorder.dropTarget.insertAfter
                                                ? "after"
                                                : "before"
                                            : null
                                    }
                                    onRequestDelete={handleRequestDeleteDashboard}
                                    onEdit={handleEditDashboardClick}
                                    onDragStart={(e) => reorder.handleDragStart(dashboard.getId(), e)}
                                    onDragOver={(e) => reorder.handleDragOver(dashboard.getId(), e)}
                                    onDrop={(e) => reorder.handleDrop(dashboard.getId(), e)}
                                    onDragEnd={reorder.handleDragEnd}
                                    onClone={handleCloneDashboardClick}
                                    onForceEviction={handleForceEvictionClick}
                                />
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                </div>
                <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!tabStripScroll.canScrollToNext}
                    onClick={tabStripScroll.scrollToNext}
                    layoutClassName={tabStripScroll.canScrollToNext ? "" : "invisible"}
                >
                    <ChevronRight fontSize="small" />
                </Button>
            </div>
            <Tooltip
                content={isSnapshot ? "Dashboards cannot be modified in snapshot mode" : "Add new dashboard"}
                side="bottom"
            >
                <Button
                    disabled={isSnapshot}
                    iconOnly
                    onClick={handleAddDashboardClick}
                    tone="accent"
                    variant="ghost"
                    size="small"
                >
                    <Add fontSize="small" />
                </Button>
            </Tooltip>
            {editingDashboard && (
                <EditDashboardMetadataDialog
                    workbench={props.workbench}
                    dashboard={editingDashboard}
                    onClose={() => setEditingDashboard(null)}
                />
            )}
            <ConfirmDeleteDashboardDialog
                open={dashboardPendingDeleteConfirmation !== null}
                onConfirmDelete={() => {
                    if (dashboardPendingDeleteConfirmation) {
                        handleRemoveDashboardClick(dashboardPendingDeleteConfirmation.getId());
                    }
                    setDashboardPendingDeleteConfirmation(null);
                }}
                onClose={() => setDashboardPendingDeleteConfirmation(null)}
            />
            <CannotRemoveLastDashboardDialog
                open={showCannotRemoveDashboardDialog}
                onClose={() => setShowCannotRemoveDashboardDialog(false)}
            />
            <DashboardDragImage ref={reorder.dragImageRef} />
        </div>
    );
}
