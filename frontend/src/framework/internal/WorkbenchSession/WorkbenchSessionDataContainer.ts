import type { LayoutElement } from "./Dashboard";
import type { SerializedWorkbenchSession } from "./WorkbenchSessionSerializer";

export enum WorkbenchSessionSource {
    LOCAL_STORAGE = "localStorage",
    BACKEND = "backend",
}

export type WorkbenchSessionDataContainer = SerializedWorkbenchSession &
    (
        | {
              id?: string; // Optional ID for the session (only when stored once), can be used to identify or restore the session
              source: WorkbenchSessionSource.LOCAL_STORAGE; // Source of the session data
          }
        | {
              id: string; // Required ID for the session (when stored multiple times), used to identify or restore the session
              source: WorkbenchSessionSource.BACKEND; // Source of the session data
              isSnapshot: boolean; // Indicates if this session is a snapshot
          }
    );

export function isPersisted(
    session: WorkbenchSessionDataContainer,
): session is Extract<WorkbenchSessionDataContainer, { id: string }> {
    return typeof session.id === "string" && session.id.length > 0;
}

export function isFromBackend(
    session: WorkbenchSessionDataContainer,
): session is Extract<WorkbenchSessionDataContainer, { source: WorkbenchSessionSource.BACKEND }> {
    return session.source === WorkbenchSessionSource.BACKEND;
}

export function isSnapshot(
    session: WorkbenchSessionDataContainer,
): session is Extract<WorkbenchSessionDataContainer, { isSnapshot: true }> {
    // Check if the session has the isSnapshot property set to true
    if (session.source !== WorkbenchSessionSource.BACKEND) {
        return false; // Only backend sessions can be snapshots
    }
    return session.isSnapshot === true;
}

export function extractLayout(session: WorkbenchSessionDataContainer): LayoutElement[] {
    const activeDashboard = session.content.dashboards.find((d) => d.id === session.content.activeDashboardId);

    if (!activeDashboard) {
        return [];
    }

    const layout: LayoutElement[] = [];

    for (const serializedInstance of activeDashboard.moduleInstances) {
        const { id, name, layoutInfo } = serializedInstance;

        layout.push({
            moduleInstanceId: id,
            moduleName: name,
            relX: layoutInfo.relX,
            relY: layoutInfo.relY,
            relHeight: layoutInfo.relHeight,
            relWidth: layoutInfo.relWidth,
            minimized: layoutInfo.minimized,
            maximized: layoutInfo.maximized,
        });
    }

    return layout;
}
