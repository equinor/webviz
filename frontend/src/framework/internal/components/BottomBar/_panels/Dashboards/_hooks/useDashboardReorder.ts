import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";

export type UseDashboardReorderResult = {
    draggedDashboardId: string | null;
    /**
     * Gap the dragged dashboard would be dropped into: 0 = before the first tab, dashboards.length =
     * after the last. Null while not over a gap that would change the order.
     */
    dropGapIndex: number | null;
    dragImageRef: React.RefObject<HTMLDivElement>;
    handleDragStart: (dashboardId: string, event: React.DragEvent) => void;
    handleTabDragOver: (dashboardId: string, event: React.DragEvent) => void;
    handleGapDragOver: (gapIndex: number, event: React.DragEvent) => void;
    handleDrop: (event: React.DragEvent) => void;
    handleDragEnd: () => void;
};

// Native HTML5 drag-and-drop, not SortableList: SortableList's ghost clone duplicates the dragged tab
// into a portal - including its element id and data attributes, which the tab/tabpanel linking and the
// roving focus rely on being unique. Native DnD never clones the element.
export function useDashboardReorder(
    dashboards: Dashboard[],
    workbenchSession: PrivateWorkbenchSession,
): UseDashboardReorderResult {
    const [draggedDashboardId, setDraggedDashboardId] = React.useState<string | null>(null);
    const [dropGapIndex, setDropGapIndex] = React.useState<number | null>(null);
    const dragImageRef = React.useRef<HTMLDivElement>(null);

    const draggedIndex =
        draggedDashboardId === null ? -1 : dashboards.findIndex((d) => d.getId() === draggedDashboardId);

    const handleDragStart = React.useCallback(function handleDragStart(dashboardId: string, event: React.DragEvent) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dashboardId);
        if (dragImageRef.current) {
            event.dataTransfer.setDragImage(dragImageRef.current, 12, 12);
        }
        setDraggedDashboardId(dashboardId);
    }, []);

    const handleGapDragOver = React.useCallback(
        function handleGapDragOver(gapIndex: number, event: React.DragEvent) {
            if (draggedIndex === -1) {
                return;
            }
            // Accepted anywhere in the strip, so the cursor doesn't flicker to "not allowed" between positions
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";

            // The gaps on either side of the dragged tab would leave the order unchanged
            const isNoOp = gapIndex === draggedIndex || gapIndex === draggedIndex + 1;
            setDropGapIndex(isNoOp ? null : gapIndex);
        },
        [draggedIndex],
    );

    const handleTabDragOver = React.useCallback(
        function handleTabDragOver(dashboardId: string, event: React.DragEvent) {
            const tabIndex = dashboards.findIndex((d) => d.getId() === dashboardId);
            if (tabIndex === -1) {
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const isOverRightHalf = event.clientX - rect.left > rect.width / 2;
            handleGapDragOver(isOverRightHalf ? tabIndex + 1 : tabIndex, event);
        },
        [dashboards, handleGapDragOver],
    );

    const handleDrop = React.useCallback(
        function handleDrop(event: React.DragEvent) {
            event.preventDefault();
            setDraggedDashboardId(null);
            setDropGapIndex(null);

            if (draggedDashboardId === null || draggedIndex === -1 || dropGapIndex === null) {
                return;
            }

            // moveDashboard's newIndex is a position in the array *after* the dragged item has been
            // removed - removing it closes a gap before the drop position if it sat before it
            const newIndex = dropGapIndex - (draggedIndex < dropGapIndex ? 1 : 0);
            workbenchSession.moveDashboard(draggedDashboardId, newIndex);
        },
        [draggedDashboardId, draggedIndex, dropGapIndex, workbenchSession],
    );

    const handleDragEnd = React.useCallback(function handleDragEnd() {
        setDraggedDashboardId(null);
        setDropGapIndex(null);
    }, []);

    return {
        draggedDashboardId,
        dropGapIndex,
        dragImageRef,
        handleDragStart,
        handleTabDragOver,
        handleGapDragOver,
        handleDrop,
        handleDragEnd,
    };
}
