import { SESSION_ID_LENGTH } from "@framework/internal/persistence/constants";

const SESSION_ID_REGEX = new RegExp(`^[a-zA-Z0-9_-]{${SESSION_ID_LENGTH}}$`);

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
