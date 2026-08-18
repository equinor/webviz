import { Ajv } from "ajv/dist/jtd";

import type { Session_api, Snapshot_api } from "@api";

import type { PrivateWorkbenchSession } from "../PrivateWorkbenchSession";
import {
    WORKBENCH_SESSION_CONTENT_STATE_SCHEMA,
    WORKBENCH_SESSION_STATE_SCHEMA,
} from "../PrivateWorkbenchSession.schema";

import { objectToJsonString } from "./hash";
import { sessionIdFromLocalStorageKey } from "./localStorageHelpers";
import { WorkbenchSessionSource, type WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";

const ajv = new Ajv();
const validateContent = ajv.compile(WORKBENCH_SESSION_CONTENT_STATE_SCHEMA);
const validateFull = ajv.compile(WORKBENCH_SESSION_STATE_SCHEMA);

export class SessionValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SessionValidationError";
    }
}

/**
 * Migrates legacy persisted content (from before multi-dashboard sessions) where the
 * RealizationFilterSet lived at the session level (`ensembleRealizationFilterSet`) into the
 * new per-dashboard shape (`dashboards[i].realizationFilterSet`).
 *
 * Legacy sessions/snapshots always had exactly one dashboard, so the whole session-level filter
 * set is moved onto dashboards[0]. Mutates and returns the same object so it can be validated
 * afterwards by AJV. Safe to call on already-migrated content: if `ensembleRealizationFilterSet`
 * is absent, this is a no-op.
 */
export function migrateLegacyRealizationFilterSetLocation(content: any): any {
    if (!content || typeof content !== "object" || !("ensembleRealizationFilterSet" in content)) {
        return content;
    }

    const legacyFilterSet = content.ensembleRealizationFilterSet;
    delete content.ensembleRealizationFilterSet;

    if (Array.isArray(content.dashboards) && content.dashboards.length > 0) {
        content.dashboards[0].realizationFilterSet = legacyFilterSet;
    }
    // If there are zero dashboards, there's nothing to migrate into - the filter data is simply
    // dropped (legacy sessions always had exactly one dashboard).

    return content;
}

export function deserializeFromLocalStorage(key: string): WorkbenchSessionDataContainer | null {
    const json = localStorage.getItem(key);
    if (!json) {
        return null;
    }
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && parsed.content) {
        migrateLegacyRealizationFilterSetLocation(parsed.content);
    }
    if (!validateFull(parsed)) {
        throw new SessionValidationError(`Local storage session validation failed ${validateFull.errors}`);
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
    migrateLegacyRealizationFilterSetLocation(parsed);
    if (!validateContent(parsed)) {
        throw new SessionValidationError(`Backend session validation failed ${validateContent.errors}`);
    }

    const session: WorkbenchSessionDataContainer = {
        metadata: {
            title: raw.metadata.title,
            description: raw.metadata.description ?? undefined,
            createdAt: new Date(raw.metadata.createdAt).getTime(),
            updatedAt: new Date(raw.metadata.updatedAt).getTime(),
            hash: raw.metadata.contentHash,
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
    migrateLegacyRealizationFilterSetLocation(parsed);
    if (!validateContent(parsed)) {
        throw new SessionValidationError(`Backend session validation failed ${validateContent.errors}`);
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
            hash: raw.metadata.contentHash,
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
        content: session.serializeContentState(),
    });
}

export function makeWorkbenchSessionLocalStorageString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        metadata: session.getMetadata(),
        content: session.serializeContentState(),
    });
}
