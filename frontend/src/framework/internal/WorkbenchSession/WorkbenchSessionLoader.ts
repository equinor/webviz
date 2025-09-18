import {
    localStorageKeyForSessionId,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
} from "./utils";
import type { WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";
import { deserializeFromLocalStorage } from "./WorkbenchSessionSerializer";

export async function loadWorkbenchSessionFromLocalStorage(
    sessionId: string | null,
): Promise<WorkbenchSessionDataContainer | null> {
    const key = localStorageKeyForSessionId(sessionId);
    return deserializeFromLocalStorage(key);
}

export async function loadAllWorkbenchSessionsFromLocalStorage(): Promise<WorkbenchSessionDataContainer[]> {
    const keys = Object.keys(localStorage).filter(
        (key) =>
            key.startsWith(WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX) ||
            key === WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
    );
    const sessions = await Promise.all(keys.map((key) => deserializeFromLocalStorage(key)));
    return sessions.filter((session: unknown): session is WorkbenchSessionDataContainer => session !== null);
}
