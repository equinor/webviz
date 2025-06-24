import { getSessionOptions } from "@api";
import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import type { QueryClient } from "@tanstack/react-query";

import type { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";
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
    atomStoreMaster: AtomStoreMaster,
    queryClient: QueryClient,
): Promise<PrivateWorkbenchSession | null> {
    return deserializeFromLocalStorage(atomStoreMaster, queryClient);
}
