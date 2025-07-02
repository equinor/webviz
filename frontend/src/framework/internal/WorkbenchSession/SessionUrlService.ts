export function buildSessionUrl(sessionId: string): string {
    const url = new URL(window.location.href);

    url.pathname = `/session/${sessionId}`;
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    return url.toString();
}

export function readSessionIdFromUrl(): string | null {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const sessionId = pathParts.includes("session") ? pathParts[pathParts.indexOf("session") + 1] : null;

    if (sessionId && /^[a-zA-Z0-9_-]{8}$/.test(sessionId)) {
        return sessionId;
    }
    return null;
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
