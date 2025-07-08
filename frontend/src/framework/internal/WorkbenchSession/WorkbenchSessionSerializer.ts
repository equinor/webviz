import type { QueryClient } from "@tanstack/query-core";
import { Ajv } from "ajv/dist/jtd";

import type { SessionDocument_api } from "@api";

import {
    PrivateWorkbenchSession,
    type WorkbenchSessionContent,
    type WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";
import { objectToJsonString, sessionIdFromLocalStorageKey } from "./utils";
import { workbenchSessionContentSchema, workbenchSessionSchema } from "./workbenchSession.jtd";

export type SerializedWorkbenchSession = {
    metadata: WorkbenchSessionMetadata;
    content: WorkbenchSessionContent;
};
const ajv = new Ajv();
const validateContent = ajv.compile(workbenchSessionContentSchema);
const validateFull = ajv.compile(workbenchSessionSchema);

export async function deserializeFromLocalStorage(
    key: string,
    queryClient: QueryClient,
): Promise<PrivateWorkbenchSession | null> {
    const json = localStorage.getItem(key);
    if (!json) return null;

    const parsed = JSON.parse(json);
    if (!validateFull(parsed)) {
        console.warn("Invalid session from localStorage", validateFull.errors);
        return null;
    }

    const session = new PrivateWorkbenchSession(queryClient);
    await session.loadContent(parsed.content);
    session.setMetadata(parsed.metadata);
    session.setLoadedFromLocalStorage(true);
    const sessionId = sessionIdFromLocalStorageKey(key);
    if (sessionId) {
        session.setId(sessionId);
        session.setIsPersisted(true);
    }
    return session;
}

export async function deserializeFromBackend(
    queryClient: QueryClient,
    raw: SessionDocument_api,
): Promise<PrivateWorkbenchSession> {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const session = new PrivateWorkbenchSession(queryClient);
    await session.loadContent(parsed);
    session.setMetadata({
        title: raw.metadata.title,
        description: raw.metadata.description ?? undefined,
        createdAt: new Date(raw.metadata.createdAt).getTime(),
        updatedAt: new Date(raw.metadata.updatedAt).getTime(),
        hash: raw.metadata.hash,
        lastModifiedMs: new Date(raw.metadata.updatedAt).getTime(), // Fallback to now if not provided
    });
    session.setId(raw.id);
    session.setIsPersisted(true);
    return session;
}

export function makeWorkbenchSessionStateString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        metadata: session.getMetadata(),
        content: session.getContent(),
    });
}
