import { getSnapshotOptions, type Snapshot_api } from "@api";
import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import type { QueryClient } from "@tanstack/react-query";
import { Ajv } from "ajv/dist/jtd";

import { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";
import { workbenchSessionContentSchema } from "./workbenchSession.jtd";

const ajv = new Ajv();
const validateContent = ajv.compile(workbenchSessionContentSchema);

export async function loadSnapshotFromBackend(
    atomStoreMaster: AtomStoreMaster,
    queryClient: QueryClient,
    snapshotId: string,
): Promise<PrivateWorkbenchSession> {
    const snapshotData = await queryClient.fetchQuery({
        ...getSnapshotOptions({ path: { snapshot_id: snapshotId } }),
    });

    return deserializeFromBackend(atomStoreMaster, queryClient, snapshotData);
}

export async function deserializeFromBackend(
    atomStore: AtomStoreMaster,
    queryClient: QueryClient,
    raw: Snapshot_api,
): Promise<PrivateWorkbenchSession> {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const snapshot = new PrivateWorkbenchSession(atomStore, queryClient, true);
    await snapshot.loadContent(parsed);
    snapshot.setMetadata({
        title: raw.metadata.title,
        description: raw.metadata.description ?? undefined,
        createdAt: new Date(raw.metadata.createdAt).getTime(),
        updatedAt: new Date(raw.metadata.updatedAt).getTime(),
        hash: raw.metadata.hash,
        lastModifiedMs: new Date().getTime(), // Fallback to now if not provided
    });
    return snapshot;
}
