import { Ajv } from "ajv/dist/jtd";

import type { Session_api, Snapshot_api } from "@api";

import type {
    PrivateWorkbenchSession,
    WorkbenchSessionContent,
    WorkbenchSessionMetadata,
} from "../PrivateWorkbenchSession";
import { workbenchSessionContentSchema, workbenchSessionSchema } from "../workbenchSession.jtd";

import { objectToJsonString } from "./hash";
import { sessionIdFromLocalStorageKey } from "./localStorageHelpers";
import { WorkbenchSessionSource, type WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";

export type SerializedWorkbenchSession = {
    metadata: WorkbenchSessionMetadata;
    content: WorkbenchSessionContent;
};
const ajv = new Ajv();
const validateContent = ajv.compile(workbenchSessionContentSchema);
const validateFull = ajv.compile(workbenchSessionSchema);

export function deserializeFromLocalStorage(key: string): WorkbenchSessionDataContainer | null {
    const json = localStorage.getItem(key);
    if (!json) return null;

    const parsed = JSON.parse(json);
    if (!validateFull(parsed)) {
        console.warn("Invalid session from localStorage", validateFull.errors);
        return null;
    }

    const session: WorkbenchSessionDataContainer = {
        metadata: parsed.metadata,
        content: parsed.content,
        id: sessionIdFromLocalStorageKey(key) ?? undefined,
        source: WorkbenchSessionSource.LOCAL_STORAGE,
    };

    return session;
}

export function deserializeSessionFromBackend(raw: Session_api): WorkbenchSessionDataContainer {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const session: WorkbenchSessionDataContainer = {
        metadata: {
            title: raw.metadata.title,
            description: raw.metadata.description ?? undefined,
            createdAt: new Date(raw.metadata.createdAt).getTime(),
            updatedAt: new Date(raw.metadata.updatedAt).getTime(),
            hash: raw.metadata.content_hash,
            lastModifiedMs: new Date(raw.metadata.updatedAt).getTime(), // Fallback to now if not provided
        },
        content: parsed,
        id: raw.metadata.id,
        source: WorkbenchSessionSource.BACKEND,
        isSnapshot: false,
    };

    return session;
}

export function deserializeSnapshotFromBackend(raw: Snapshot_api): WorkbenchSessionDataContainer {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const snapshot: WorkbenchSessionDataContainer = {
        id: raw.metadata.id,
        isSnapshot: true,
        source: WorkbenchSessionSource.BACKEND,
        metadata: {
            title: raw.metadata.title,
            description: raw.metadata.description ?? undefined,
            createdAt: new Date(raw.metadata.createdAt).getTime(),
            // Snapshots cannot be updated, so we use createdAt for both fields
            updatedAt: new Date(raw.metadata.createdAt).getTime(),
            hash: raw.metadata.content_hash,
            lastModifiedMs: new Date().getTime(), // Fallback to now if not provided
        },
        content: parsed,
    };

    return snapshot;
}

export function makeWorkbenchSessionStateString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        metadata: {
            title: session.getMetadata().title,
            description: session.getMetadata().description,
        },
        content: session.getContent(),
    });
}

export function makeWorkbenchSessionLocalStorageString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        metadata: session.getMetadata(),
        content: session.getContent(),
    });
}
