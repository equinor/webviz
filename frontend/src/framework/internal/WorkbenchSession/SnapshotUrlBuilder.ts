export function buildSnapshotUrl(snapshotId: string): string {
    const url = new URL(window.location.href);

    url.pathname = `/snapshot/${snapshotId}`;
    url.search = ""; // Clear any existing query parameters
    url.hash = ""; // Clear any existing hash
    return url.toString();
}

export function readSnapshotIdFromUrl(): string | null {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const snapshotId = pathParts.includes("snapshot") ? pathParts[pathParts.indexOf("snapshot") + 1] : null;

    if (snapshotId && /^[a-zA-Z0-9_-]{8}$/.test(snapshotId)) {
        return snapshotId;
    }
    return null;
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
    window.history.replaceState({}, "", url.toString());
}
