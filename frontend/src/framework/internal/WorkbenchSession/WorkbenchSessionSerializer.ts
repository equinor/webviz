import type { SessionRecord_api } from "@api";
import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import type { QueryClient } from "@tanstack/query-core";
import { Ajv } from "ajv/dist/jtd";

import {
    PrivateWorkbenchSession,
    type WorkbenchSessionContent,
    type WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";
import { objectToJsonString } from "./utils";
import { workbenchSessionContentSchema, workbenchSessionSchema } from "./workbenchSession.jtd";

export type SerializedWorkbenchSession = {
    metadata: WorkbenchSessionMetadata;
    content: WorkbenchSessionContent;
};
const ajv = new Ajv();
const validateContent = ajv.compile(workbenchSessionContentSchema);
const validateFull = ajv.compile(workbenchSessionSchema);

export async function deserializeFromLocalStorage(
    atomStore: AtomStoreMaster,
    queryClient: QueryClient,
): Promise<PrivateWorkbenchSession | null> {
    const json = localStorage.getItem("workbench-session");
    if (!json) return null;

    const parsed = JSON.parse(json);
    if (!validateFull(parsed)) {
        console.warn("Invalid session from localStorage", validateFull.errors);
        return null;
    }

    const session = new PrivateWorkbenchSession(atomStore, queryClient);
    await session.loadContent(parsed.content);
    session.setMetadata(parsed.metadata);
    return session;
}

export async function deserializeFromBackend(
    atomStore: AtomStoreMaster,
    queryClient: QueryClient,
    raw: SessionRecord_api,
): Promise<PrivateWorkbenchSession> {
    const parsed = JSON.parse(raw.content);
    if (!validateContent(parsed)) {
        throw new Error(`Backend session validation failed ${validateContent.errors}`);
    }

    const session = new PrivateWorkbenchSession(atomStore, queryClient);
    await session.loadContent(parsed);
    session.setMetadata({
        title: raw.metadata.title,
        description: raw.metadata.description ?? undefined,
    });
    session.setId(raw.id);
    session.setIsPersisted(true);
    return session;
}

export function makeWorkbenchSessionStateString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        version: 1,
        metadata: session.getMetadata(),
        content: session.getContent(),
    });
}
