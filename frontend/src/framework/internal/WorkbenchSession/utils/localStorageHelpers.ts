export const WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX = "workbench-session-";
export const WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP = "temp-workbench-session";

export function localStorageKeyForSessionId(sessionId: string | null): string {
    if (!sessionId) {
        return WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP;
    }
    return `${WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX}${sessionId}`;
}

export function sessionIdFromLocalStorageKey(key: string): string | null {
    if (key.startsWith(WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX)) {
        return key.slice(WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX.length);
    }
    return null;
}

export function getIdFromLocalStorageKey(key: string): string | null {
    const prefix = "workbench-session-";
    if (key.startsWith(prefix)) {
        return key.slice(prefix.length);
    }
    return null;
}
