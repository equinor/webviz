import React from "react";

import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { toastManager } from "@framework/toastManager";
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

    const reorder = useDashboardReorder(dashboards, workbenchSession);
    const { optimisticActiveDashboardId, selectDashboard } = useOptimisticActiveDashboard(
        props.workbench,
        workbenchSession,
    );
    const tabStripScroll = useDashboardTabStripScroll(
        dashboards,
        optimisticActiveDashboardId ?? activeDashboard?.getId() ?? null,
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
            try {
                workbenchSession.removeDashboard(dashboardId);
            } catch (error) {
                // removeDashboard() throws rather than proceeding if the dashboard being removed is
                // active and none of the remaining dashboards could be activated as its replacement
                // (see its own comment) - an edge case, but this is a plain event handler, not a
                // render/lifecycle path React's error boundary can catch, so report it instead of
                // letting it go uncaught.
                console.error(`Failed to remove dashboard "${dashboardId}":`, error);
                toastManager.add({ title: "Failed to remove dashboard", type: "error" });
            }
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
            if (dashboard.getLayoutForPreview().length === 0) {
                handleRemoveDashboardClick(dashboard.getId());
                return;
            }
            setDashboardPendingDeleteConfirmation(dashboard);
        },
        [dashboards, handleRemoveDashboardClick],
    );

    const handleCloneDashboardClick = React.useCallback(
        function handleCloneDashboardClick(dashboardId: string) {
            // cloneDashboard() is async and can reject (e.g. activating the clone fails to load, see
            // setActiveDashboard()'s own try/catch) - dropping the returned promise here would leave
            // that rejection unhandled: React error boundaries don't catch async rejections any more
            // than they catch plain event-handler throws, so report it the same way the adjacent
            // dashboard removal failure is.
            workbenchSession
                .cloneDashboard(dashboardId)
                .then(() => {
                    toastManager.add({ title: "Dashboard cloned", type: "success" });
                })
                .catch((error: unknown) => {
                    console.error(`Failed to clone dashboard "${dashboardId}":`, error);
                    toastManager.add({ title: "Failed to clone dashboard", type: "error" });
                });
        },
        [workbenchSession],
    );

    const handleForceEvictionClick = React.useCallback(
        function handleForceEvictionClick(dashboardId: string) {
            workbenchSession.getDashboardHotCache().evictNow(dashboardId);
        },
        [workbenchSession],
    );

    const handleMoveDashboardLeftClick = React.useCallback(
        function handleMoveDashboardLeftClick(dashboardId: string) {
            const index = dashboards.findIndex((d) => d.getId() === dashboardId);
            if (index <= 0) {
                return;
            }
            workbenchSession.moveDashboard(dashboardId, index - 1);
        },
        [dashboards, workbenchSession],
    );

    const handleMoveDashboardRightClick = React.useCallback(
        function handleMoveDashboardRightClick(dashboardId: string) {
            const index = dashboards.findIndex((d) => d.getId() === dashboardId);
            if (index === -1 || index >= dashboards.length - 1) {
                return;
            }
            workbenchSession.moveDashboard(dashboardId, index + 1);
        },
        [dashboards, workbenchSession],
    );

    return (
        <div className="gap-xs -mt-[2px] flex w-full items-center">
            <div className="gap-3xs flex min-w-0 items-center">
                <Button
                    aria-label="Scroll to previous dashboard"
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
                            {dashboards.map((dashboard, index) => (
                                <DashboardTab
                                    key={dashboard.getId()}
                                    dashboard={dashboard}
                                    draggable={!isSnapshot}
                                    isHot={
                                        dashboard.getId() === activeDashboard?.getId() ||
                                        hotDashboardIds.includes(dashboard.getId())
                                    }
                                    isDragged={reorder.draggedDashboardId === dashboard.getId()}
                                    isSnapshot={isSnapshot}
                                    previewDisabled={reorder.draggedDashboardId !== null}
                                    dropIndicatorSide={
                                        reorder.dropTarget?.dashboardId === dashboard.getId()
                                            ? reorder.dropTarget.insertAfter
                                                ? "after"
                                                : "before"
                                            : null
                                    }
                                    canMoveLeft={index > 0}
                                    canMoveRight={index < dashboards.length - 1}
                                    onRequestDelete={handleRequestDeleteDashboard}
                                    onEdit={handleEditDashboardClick}
                                    onDragStart={(e) => reorder.handleDragStart(dashboard.getId(), e)}
                                    onDragOver={(e) => reorder.handleDragOver(dashboard.getId(), e)}
                                    onDrop={(e) => reorder.handleDrop(dashboard.getId(), e)}
                                    onDragEnd={reorder.handleDragEnd}
                                    onClone={handleCloneDashboardClick}
                                    onForceEviction={handleForceEvictionClick}
                                    onMoveLeft={handleMoveDashboardLeftClick}
                                    onMoveRight={handleMoveDashboardRightClick}
                                />
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                </div>
                <Button
                    aria-label="Scroll to next dashboard"
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
                    aria-label="Add new dashboard"
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
