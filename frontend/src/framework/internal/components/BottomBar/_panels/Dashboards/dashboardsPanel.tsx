import React from "react";

import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";
import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";

import type { Dashboard } from "@framework/internal/Dashboard";
import { useKeepAliveDashboardIds } from "@framework/internal/hooks/useKeepAliveDashboardIds";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { toastManager } from "@framework/toastManager";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveSession } from "../../../ActiveSessionBoundary";

import {
    ConfirmDeleteDashboardDialog,
    DashboardDragImage,
    DashboardTab,
    DashboardTabGap,
    EditDashboardMetadataDialog,
} from "./_components";
import {
    DASHBOARD_TAB_PREVIEW_CLOSE_DELAY_MS,
    DASHBOARD_TAB_PREVIEW_OPEN_DELAY_MS,
} from "./_components/dashboardTabPreview";
import {
    useDashboardReorder,
    useDashboardTabRovingFocus,
    useDashboardTabStripScroll,
    useOptimisticActiveDashboard,
} from "./_hooks";

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
    const keepAliveIds = useKeepAliveDashboardIds(workbenchSession);

    const [editingDashboard, setEditingDashboard] = React.useState<Dashboard | null>(null);
    const [dashboardPendingDeleteConfirmation, setDashboardPendingDeleteConfirmation] =
        React.useState<Dashboard | null>(null);

    const reorder = useDashboardReorder(dashboards, workbenchSession);
    const { optimisticActiveDashboardId, selectDashboard } = useOptimisticActiveDashboard(
        props.workbench,
        workbenchSession,
    );
    const resolvedActiveDashboardId = optimisticActiveDashboardId ?? activeDashboard?.getId() ?? null;
    const tabStripScroll = useDashboardTabStripScroll(dashboards, resolvedActiveDashboardId);
    const rovingFocus = useDashboardTabRovingFocus(
        dashboards,
        resolvedActiveDashboardId,
        selectDashboard,
        tabStripScroll.contentRef,
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
        <div className="gap-xs px-sm -mt-[2px] flex w-full items-center">
            <div className="gap-3xs flex min-w-0 items-center">
                <Button
                    aria-label="Scroll to previous dashboard"
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!tabStripScroll.canScrollToPrevious}
                    onClick={tabStripScroll.scrollToPrevious}
                    layoutClassName={tabStripScroll.canScrollToPrevious ? "" : "hidden"}
                >
                    <ChevronLeft style={{ fontSize: 16 }} />
                </Button>
                <div
                    ref={tabStripScroll.scrollContainerRef}
                    className={resolveClassNames(
                        // `scrollbar-width: none` only supported in Webkit after Jan 2024 - keeping a fallback
                        "px-xs min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden",
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
                    <div
                        ref={tabStripScroll.contentRef}
                        role="tablist"
                        aria-label="Dashboards"
                        className="flex h-full w-max items-center pb-px"
                        onKeyDown={rovingFocus.onKeyDown}
                    >
                        {/*
                            Shares one open/close delay across every tab's preview popover, so that
                            once the pointer has opened one preview, brushing across neighbouring
                            tabs opens theirs instantly instead of re-running the hover delay on each.
                        */}
                        <TooltipBase.Provider
                            delay={DASHBOARD_TAB_PREVIEW_OPEN_DELAY_MS}
                            closeDelay={DASHBOARD_TAB_PREVIEW_CLOSE_DELAY_MS}
                        >
                            {dashboards.map((dashboard, index) => (
                                <React.Fragment key={dashboard.getId()}>
                                    <DashboardTabGap
                                        withSeparator={index > 0}
                                        isDropTarget={reorder.dropGapIndex === index}
                                        onDragOver={(e) => reorder.handleGapDragOver(index, e)}
                                        onDrop={reorder.handleDrop}
                                    />
                                    <DashboardTab
                                        dashboard={dashboard}
                                        draggable={!isSnapshot}
                                        isActive={dashboard.getId() === resolvedActiveDashboardId}
                                        tabIndex={rovingFocus.getTabIndex(dashboard.getId())}
                                        isHot={keepAliveIds.has(dashboard.getId())}
                                        isEvictable={hotDashboardIds.includes(dashboard.getId())}
                                        isDragged={reorder.draggedDashboardId === dashboard.getId()}
                                        isSnapshot={isSnapshot}
                                        previewDisabled={reorder.draggedDashboardId !== null}
                                        canMoveLeft={index > 0}
                                        canMoveRight={index < dashboards.length - 1}
                                        canBeDeleted={dashboards.length > 1}
                                        onSelect={selectDashboard}
                                        onRequestDelete={handleRequestDeleteDashboard}
                                        onEdit={handleEditDashboardClick}
                                        onDragStart={(e) => reorder.handleDragStart(dashboard.getId(), e)}
                                        onDragOver={(e) => reorder.handleTabDragOver(dashboard.getId(), e)}
                                        onDrop={(e) => reorder.handleDrop(e)}
                                        onDragEnd={reorder.handleDragEnd}
                                        onClone={handleCloneDashboardClick}
                                        onForceEviction={handleForceEvictionClick}
                                        onMoveLeft={handleMoveDashboardLeftClick}
                                        onMoveRight={handleMoveDashboardRightClick}
                                    />
                                </React.Fragment>
                            ))}
                            <DashboardTabGap
                                withSeparator={false}
                                isDropTarget={reorder.dropGapIndex === dashboards.length}
                                onDragOver={(e) => reorder.handleGapDragOver(dashboards.length, e)}
                                onDrop={reorder.handleDrop}
                            />
                        </TooltipBase.Provider>
                    </div>
                </div>
                <Button
                    aria-label="Scroll to next dashboard"
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!tabStripScroll.canScrollToNext}
                    onClick={tabStripScroll.scrollToNext}
                    layoutClassName={tabStripScroll.canScrollToNext ? "" : "hidden"}
                >
                    <ChevronRight style={{ fontSize: 16 }} />
                </Button>
            </div>
            <Tooltip
                content={isSnapshot ? "Dashboards cannot be modified in snapshot mode" : "Add new dashboard"}
                side="bottom"
            >
                <Button
                    aria-label="Add new dashboard"
                    disabled={isSnapshot}
                    focusableWhenDisabled
                    iconOnly
                    onClick={handleAddDashboardClick}
                    tone="accent"
                    variant="contained"
                    size="small"
                >
                    <Add style={{ fontSize: 16 }} />
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
                dashboardName={dashboardPendingDeleteConfirmation?.getMetadata().name}
                onConfirmDelete={() => {
                    if (dashboardPendingDeleteConfirmation) {
                        handleRemoveDashboardClick(dashboardPendingDeleteConfirmation.getId());
                    }
                    setDashboardPendingDeleteConfirmation(null);
                }}
                onClose={() => setDashboardPendingDeleteConfirmation(null)}
            />
            <DashboardDragImage ref={reorder.dragImageRef} />
        </div>
    );
}
