import { validate as isUuid } from "uuid";

import { DASHBOARD_ID_LENGTH, SESSION_ID_LENGTH } from "@framework/internal/persistence/constants";

const SESSION_ID_REGEX = new RegExp(`^[a-zA-Z0-9_-]{${SESSION_ID_LENGTH}}$`);
const DASHBOARD_ID_REGEX = new RegExp(`^[a-zA-Z0-9_-]{${DASHBOARD_ID_LENGTH}}$`);

export class UrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UrlError";
    }
}

// Everything the workbench URL can express, built and read as a whole - so e.g. rewriting the session id
// can't silently drop the dashboard segment
export type WorkbenchUrlLocation =
    | { kind: "root" }
    | { kind: "session"; sessionId: string; dashboardId: string | null }
    | { kind: "snapshot"; snapshotId: string; dashboardId: string | null };

export function buildWorkbenchUrl(location: WorkbenchUrlLocation): string {
    const url = new URL(window.location.href);
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash

    const pathParts: string[] = [];
    if (location.kind === "session") {
        pathParts.push("session", location.sessionId);
    } else if (location.kind === "snapshot") {
        pathParts.push("snapshot", location.snapshotId);
    }
    if (location.kind !== "root" && location.dashboardId) {
        pathParts.push("dashboard", location.dashboardId);
    }

    url.pathname = pathParts.length > 0 ? `/${pathParts.join("/")}` : "/";
    return url.toString();
}

// Reads all ids in one pass, so a URL rewrite in between can't make them inconsistent
export function readWorkbenchUrlLocation(): WorkbenchUrlLocation {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/").filter(Boolean);

    const dashboardId = readDashboardSegment(pathParts);

    const sessionIndex = pathParts.indexOf("session");
    if (sessionIndex !== -1) {
        const sessionId = pathParts[sessionIndex + 1];
        if (!sessionId) {
            return { kind: "root" };
        }
        if (!SESSION_ID_REGEX.test(sessionId)) {
            throw new UrlError(`Invalid session ID in URL: ${sessionId}`);
        }
        return { kind: "session", sessionId, dashboardId };
    }

    const snapshotIndex = pathParts.indexOf("snapshot");
    if (snapshotIndex !== -1) {
        const snapshotId = pathParts[snapshotIndex + 1];
        if (!snapshotId) {
            return { kind: "root" };
        }
        if (!SESSION_ID_REGEX.test(snapshotId)) {
            throw new UrlError(`Invalid snapshot ID in URL: ${snapshotId}`);
        }
        return { kind: "snapshot", snapshotId, dashboardId };
    }

    return { kind: "root" };
}

function readDashboardSegment(pathParts: string[]): string | null {
    const dashboardIndex = pathParts.indexOf("dashboard");
    if (dashboardIndex === -1) {
        return null;
    }

    const dashboardId = pathParts[dashboardIndex + 1];
    if (!dashboardId) {
        return null;
    }

    // Older persisted dashboards still have uuid ids (from before the shorter nanoid ones), so accept both.
    // Anything else is ignored, falling back to the default dashboard.
    if (!DASHBOARD_ID_REGEX.test(dashboardId) && !isUuid(dashboardId)) {
        console.warn(`Invalid dashboard ID in URL, ignoring: ${dashboardId}`);
        return null;
    }

    return dashboardId;
}
