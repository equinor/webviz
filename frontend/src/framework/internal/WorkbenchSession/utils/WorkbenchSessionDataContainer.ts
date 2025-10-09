import type { LayoutElement } from "../../Dashboard";

import type { SerializedWorkbenchSession } from "./serialization";

export enum WorkbenchSessionSource {
    LOCAL_STORAGE = "localStorage",
}

export type WorkbenchSessionDataContainer = SerializedWorkbenchSession & {
    id?: string; // Optional ID for the session (only when stored once), can be used to identify or restore the session
    source: WorkbenchSessionSource.LOCAL_STORAGE; // Source of the session data
};

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
