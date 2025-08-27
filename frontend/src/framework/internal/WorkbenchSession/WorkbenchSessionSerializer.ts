import { Ajv } from "ajv/dist/jtd";

import type { SessionDocument_api } from "@api";

import type {
    PrivateWorkbenchSession,
    WorkbenchSessionContent,
    WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";
import { objectToJsonString, sessionIdFromLocalStorageKey } from "./utils";
import { workbenchSessionContentSchema, workbenchSessionSchema } from "./workbenchSession.jtd";
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

export function deserializeFromBackend(raw: SessionDocument_api): WorkbenchSessionDataContainer {
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
            hash: raw.metadata.hash,
            lastModifiedMs: new Date(raw.metadata.updatedAt).getTime(), // Fallback to now if not provided
        },
        content: parsed,
        id: raw.id,
        source: WorkbenchSessionSource.BACKEND,
        isSnapshot: false,
    };

    return session;
}

export function makeWorkbenchSessionStateString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        metadata: session.getMetadata(),
        content: session.getContent(),
    });
}
