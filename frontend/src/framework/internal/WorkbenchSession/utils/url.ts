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

// A single type for everything the workbench URL can express, so building or reading a URL always
// considers the whole entity (session/snapshot + dashboard) in one call. Keeping session/snapshot
// and dashboard as separately buildable/readable segments let them drift out of sync - e.g. a
// session-id URL rewrite silently dropping a dashboard segment nobody remembered to re-add.
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

// Parses the whole current URL in one pass, so session/snapshot/dashboard ids are always read as a
// single consistent snapshot of the URL - never as separate reads that a URL rewrite in between
// could invalidate (a past source of bugs: code reading the dashboard id had to run "before" code
// reading the session id purely because the latter rewrote the whole path as a side effect).
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

// Dashboards used to have uuid.v4()-shaped (36 char) IDs before switching to the shorter
// DASHBOARD_ID_LENGTH nanoid shape, and existing persisted dashboards still carry those old IDs.
// buildWorkbenchUrl writes whatever ID the Dashboard has into the URL, so a URL with a uuid-shaped
// dashboard segment is not malformed - it is just an old dashboard. Accept both shapes here; only an
// ID matching neither is treated as invalid and dropped (falling back to the default dashboard)
// rather than as a hard URL error.
function readDashboardSegment(pathParts: string[]): string | null {
    const dashboardIndex = pathParts.indexOf("dashboard");
    if (dashboardIndex === -1) {
        return null;
    }

    const dashboardId = pathParts[dashboardIndex + 1];
    if (!dashboardId) {
        return null;
    }

    if (!DASHBOARD_ID_REGEX.test(dashboardId) && !isUuid(dashboardId)) {
        console.warn(`Invalid dashboard ID in URL, ignoring: ${dashboardId}`);
        return null;
    }

    return dashboardId;
}
