import { DASHBOARD_ID_LENGTH, SESSION_ID_LENGTH } from "@framework/internal/persistence/constants";

const SESSION_ID_REGEX = new RegExp(`^[a-zA-Z0-9_-]{${SESSION_ID_LENGTH}}$`);
const DASHBOARD_ID_REGEX = new RegExp(`^[a-zA-Z0-9_-]{${DASHBOARD_ID_LENGTH}}$`);

export class UrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UrlError";
    }
}

export function buildSessionUrl(sessionId: string): string {
    const url = new URL(window.location.href);

    url.pathname = `/session/${sessionId}`;
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    return url.toString();
}

export function readSessionIdFromUrl(): string | null {
    return readIdFromUrl("session");
}

export function removeSessionIdFromUrl(): void {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const sessionIndex = pathParts.indexOf("session");

    if (sessionIndex === -1) {
        return;
    }

    url.pathname = "/"; // Reset to root if no snapshot ID is present
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    window.history.pushState({}, "", url.toString());
}

export function buildSnapshotUrl(snapshotId: string): string {
    const url = new URL(window.location.href);

    url.pathname = `/snapshot/${snapshotId}`;
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    return url.toString();
}

export function readSnapshotIdFromUrl(): string | null {
    return readIdFromUrl("snapshot");
}

export function removeSnapshotIdFromUrl(): void {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const snapshotIndex = pathParts.indexOf("snapshot");

    if (snapshotIndex === -1) {
        return;
    }

    url.pathname = "/"; // Reset to root if no snapshot ID is present
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    window.history.pushState({}, "", url.toString());
}

function readIdFromUrl(type: "session" | "snapshot"): string | null {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const id = pathParts.includes(type) ? pathParts[pathParts.indexOf(type) + 1] : null;

    if (!id) {
        return null;
    }

    if (!SESSION_ID_REGEX.test(id)) {
        throw new UrlError(`Invalid ${type} ID in URL: ${id}`);
    }

    return id;
}

// Independent of buildSessionUrl/buildSnapshotUrl - layers a /dashboard/:id segment onto whatever
// path is currently set (session, snapshot, or root) rather than needing to know which.
export function buildDashboardUrl(dashboardId: string | null): string {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/").filter(Boolean);

    const dashboardIndex = pathParts.indexOf("dashboard");
    if (dashboardIndex !== -1) {
        pathParts.splice(dashboardIndex, 2);
    }

    if (dashboardId) {
        pathParts.push("dashboard", dashboardId);
    }

    url.pathname = `/${pathParts.join("/")}`;
    return url.toString();
}

// Unlike readSessionIdFromUrl/readSnapshotIdFromUrl, this never throws on a malformed id - it warns
// and returns null instead. Dashboards used to have uuid.v4()-shaped (36 char) IDs before switching to
// the shorter DASHBOARD_ID_LENGTH shape; links/reloads carrying an old-shaped ID must still open the
// session (falling back to its default dashboard) rather than being treated as a hard URL error.
// TODO: once dashboard ID porting/migration is implemented for old persisted sessions, this can go
// back to throwing UrlError like the other read*IdFromUrl functions.
export function readDashboardIdFromUrl(): string | null {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const id = pathParts.includes("dashboard") ? pathParts[pathParts.indexOf("dashboard") + 1] : null;

    if (!id) {
        return null;
    }

    if (!DASHBOARD_ID_REGEX.test(id)) {
        console.warn(`Invalid dashboard ID in URL, ignoring: ${id}`);
        return null;
    }

    return id;
}
