import { getSessionOptions } from "@api";
import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import type { QueryClient } from "@tanstack/react-query";

import type { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";
import {
    localStorageKeyForSessionId,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX,
    WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
} from "./utils";
import { deserializeFromBackend, deserializeFromLocalStorage } from "./WorkbenchSessionSerializer";

export async function loadWorkbenchSessionFromBackend(
    atomStoreMaster: AtomStoreMaster,
    queryClient: QueryClient,
    sessionId: string,
): Promise<PrivateWorkbenchSession> {
    const sessionData = await queryClient.fetchQuery({
        ...getSessionOptions({ path: { session_id: sessionId } }),
    });

    return deserializeFromBackend(atomStoreMaster, queryClient, sessionData);
}

export async function loadWorkbenchSessionFromLocalStorage(
    sessionId: string | null,
    atomStoreMaster: AtomStoreMaster,
    queryClient: QueryClient,
): Promise<PrivateWorkbenchSession | null> {
    const key = localStorageKeyForSessionId(sessionId);
    return deserializeFromLocalStorage(key, atomStoreMaster, queryClient);
}

export async function loadAllWorkbenchSessionsFromLocalStorage(
    atomStoreMaster: AtomStoreMaster,
    queryClient: QueryClient,
): Promise<PrivateWorkbenchSession[]> {
    const keys = Object.keys(localStorage).filter(
        (key) =>
            key.startsWith(WORKBENCH_SESSION_LOCAL_STORAGE_KEY_PREFIX) ||
            key === WORKBENCH_SESSION_LOCAL_STORAGE_KEY_TEMP,
    );
    const sessions = await Promise.all(
        keys.map((key) => deserializeFromLocalStorage(key, atomStoreMaster, queryClient)),
    );
    return sessions.filter((session): session is PrivateWorkbenchSession => session !== null);
}
