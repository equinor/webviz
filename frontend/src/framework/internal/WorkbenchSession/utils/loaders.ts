import type { QueryClient } from "@tanstack/query-core";

import { getSessionOptions, getSnapshotOptions } from "@api";

import {
    deserializeSessionFromBackend,
    deserializeFromLocalStorage,
    deserializeSnapshotFromBackend,
} from "./deserialization";
import {
    localStorageKeyForSessionId,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
} from "./localStorageHelpers";
import type { WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";

export async function loadWorkbenchSessionFromBackend(
    queryClient: QueryClient,
    sessionId: string,
): Promise<WorkbenchSessionDataContainer> {
    const sessionData = await queryClient.fetchQuery({
        ...getSessionOptions({ path: { session_id: sessionId } }),
    });

    return deserializeSessionFromBackend(sessionData);
}

export async function loadSnapshotFromBackend(
    queryClient: QueryClient,
    snapshotId: string,
): Promise<WorkbenchSessionDataContainer> {
    const snapshotData = await queryClient.fetchQuery({
        ...getSnapshotOptions({ path: { snapshot_id: snapshotId } }),
    });

    return deserializeSnapshotFromBackend(snapshotData);
}

export function loadWorkbenchSessionFromLocalStorage(sessionId: string | null): WorkbenchSessionDataContainer | null {
    const key = localStorageKeyForSessionId(sessionId);
    return deserializeFromLocalStorage(key);
}

export function getAllWorkbenchSessionLocalStorageKeys(): string[] {
    return Object.keys(localStorage).filter(
        (key) =>
            key.startsWith(WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX) ||
            key === WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
    );
}

export function loadAllWorkbenchSessionsFromLocalStorage(): WorkbenchSessionDataContainer[] {
    const keys = getAllWorkbenchSessionLocalStorageKeys();
    const sessions: WorkbenchSessionDataContainer[] = [];

    for (const key of keys) {
        try {
            const session = deserializeFromLocalStorage(key);
            if (session) {
                sessions.push(session);
            }
        } catch {
            // Ignore deserialization errors
        }
    }

    return sessions;
}
