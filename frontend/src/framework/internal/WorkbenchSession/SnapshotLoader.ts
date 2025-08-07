import type { QueryClient } from "@tanstack/react-query";
import { Ajv } from "ajv/dist/jtd";

import { getSnapshotOptions, type Snapshot_api } from "@api";

import { workbenchSessionContentSchema } from "./workbenchSession.jtd";
import { WorkbenchSessionSource, type WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";

const ajv = new Ajv();
const validateContent = ajv.compile(workbenchSessionContentSchema);

export async function loadSnapshotFromBackend(
    queryClient: QueryClient,
    snapshotId: string,
): Promise<WorkbenchSessionDataContainer> {
    const snapshotData = await queryClient.fetchQuery({
        ...getSnapshotOptions({ path: { snapshot_id: snapshotId } }),
    });

    return deserializeFromBackend(snapshotData);
}

export function deserializeFromBackend(raw: Snapshot_api): WorkbenchSessionDataContainer {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const snapshot: WorkbenchSessionDataContainer = {
        id: raw.id,
        isSnapshot: true,
        source: WorkbenchSessionSource.BACKEND,
        metadata: {
            title: raw.metadata.title,
            description: raw.metadata.description ?? undefined,
            createdAt: new Date(raw.metadata.createdAt).getTime(),
            updatedAt: new Date(raw.metadata.updatedAt).getTime(),
            hash: raw.metadata.hash,
            lastModifiedMs: new Date().getTime(), // Fallback to now if not provided
        },
        content: parsed,
    };

    return snapshot;
}
