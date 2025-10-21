import type { QueryClient } from "@tanstack/query-core";

import { getSessionOptions, getSnapshotOptions } from "@api";

import {
    localStorageKeyForSessionId,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
} from "./localStorageHelpers";
import {
    deserializeSessionFromBackend,
    deserializeFromLocalStorage,
    deserializeSnapshotFromBackend,
} from "./serialization";
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
