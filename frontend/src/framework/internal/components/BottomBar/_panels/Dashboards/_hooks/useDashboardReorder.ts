import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";

export type DashboardDropTarget = {
    dashboardId: string;
    insertAfter: boolean;
};

export type UseDashboardReorderResult = {
    draggedDashboardId: string | null;
    dropTarget: DashboardDropTarget | null;
    dragImageRef: React.RefObject<HTMLDivElement>;
    handleDragStart: (dashboardId: string, event: React.DragEvent) => void;
    handleDragOver: (dashboardId: string, event: React.DragEvent) => void;
    handleDrop: (targetDashboardId: string, event: React.DragEvent) => void;
    handleDragEnd: () => void;
};

// Native HTML5 drag-and-drop, not SortableList: SortableList's ghost-clone mechanism duplicates
// the dragged element into a portal, which breaks Tabs.Tab (a stateful base-ui component that
// registers with Tabs.Root/Tabs.Indicator) - two simultaneously-mounted instances with the same
// value fight over the active-tab indicator's positioning and cause a render loop. Native DnD
// never clones the element, so it doesn't hit that problem.
export function useDashboardReorder(
    dashboards: Dashboard[],
    workbenchSession: PrivateWorkbenchSession,
): UseDashboardReorderResult {
    const [draggedDashboardId, setDraggedDashboardId] = React.useState<string | null>(null);
    const [dropTarget, setDropTarget] = React.useState<DashboardDropTarget | null>(null);
    const dragImageRef = React.useRef<HTMLDivElement>(null);

    const handleDragStart = React.useCallback(function handleDragStart(dashboardId: string, event: React.DragEvent) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dashboardId);
        if (dragImageRef.current) {
            event.dataTransfer.setDragImage(dragImageRef.current, 12, 12);
        }
        setDraggedDashboardId(dashboardId);
    }, []);

    const handleDragOver = React.useCallback(
        function handleDragOver(dashboardId: string, event: React.DragEvent) {
            if (!draggedDashboardId || draggedDashboardId === dashboardId) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";

            const rect = event.currentTarget.getBoundingClientRect();
            const insertAfter = event.clientX - rect.left > rect.width / 2;
            setDropTarget((prev) => {
                if (prev?.dashboardId === dashboardId && prev.insertAfter === insertAfter) {
                    return prev;
                }
                return { dashboardId, insertAfter };
            });
        },
        [draggedDashboardId],
    );

    const handleDrop = React.useCallback(
        function handleDrop(targetDashboardId: string, event: React.DragEvent) {
            event.preventDefault();
            const draggedId = event.dataTransfer.getData("text/plain");
            const insertAfter = dropTarget?.dashboardId === targetDashboardId && dropTarget.insertAfter;
            setDraggedDashboardId(null);
            setDropTarget(null);

            if (!draggedId || draggedId === targetDashboardId) {
                return;
            }
            const draggedIndex = dashboards.findIndex((d) => d.getId() === draggedId);
            const targetIndex = dashboards.findIndex((d) => d.getId() === targetDashboardId);
            if (draggedIndex === -1 || targetIndex === -1) {
                return;
            }

            // moveDashboard's newIndex is a position in the array *after* the dragged item has
            // already been removed - shift the target index down by one when the dragged item
            // currently sits before it, since removing it closes that gap.
            const postRemovalTargetIndex = targetIndex - (draggedIndex < targetIndex ? 1 : 0);
            const newIndex = insertAfter ? postRemovalTargetIndex + 1 : postRemovalTargetIndex;
            workbenchSession.moveDashboard(draggedId, newIndex);
        },
        [dashboards, dropTarget, workbenchSession],
    );

    const handleDragEnd = React.useCallback(function handleDragEnd() {
        setDraggedDashboardId(null);
        setDropTarget(null);
    }, []);

    return {
        draggedDashboardId,
        dropTarget,
        dragImageRef,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd,
    };
}
