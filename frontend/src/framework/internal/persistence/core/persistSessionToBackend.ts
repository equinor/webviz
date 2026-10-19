import { objectToJsonString } from "@framework/internal/WorkbenchSession/utils/hash";
import type { Workbench } from "@framework/Workbench";

import type { PrivateWorkbenchSession } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { MAX_CONTENT_SIZE_BYTES } from "../constants";

import { BackendSyncManager, type SessionSavePayload } from "./BackendSyncManager";

export enum PersistFailureReason {
    SAVE_IN_PROGRESS = "SAVE_IN_PROGRESS", // A save is already in progress
    NO_CHANGES = "NO_CHANGES", // There are no changes to persist
    CONTENT_TOO_LARGE = "CONTENT_TOO_LARGE", // The session content exceeds the maximum allowed size
    ERROR = "ERROR", // An error occurred
}

export type PersistResult =
    | {
          success: true;
          sessionId: string;
      }
    | {
          success: false;
          reason: PersistFailureReason;
          message?: string;
      };

/** What saving the session writes to the backend, as of now */
export function makeSessionSavePayload(session: PrivateWorkbenchSession): SessionSavePayload {
    const { title, description } = session.getMetadata();
    return { title, description, content: objectToJsonString(session.serializeContentState()) };
}

/**
 * Writes the session to the backend. A session that was never persisted is created
 * there, and gets the new id and is marked as persisted.
 * @param payload What to write - the session's current state, if not given
 */
export async function persistSessionToBackend(
    workbench: Workbench,
    session: PrivateWorkbenchSession,
    payload?: SessionSavePayload,
): Promise<PersistResult> {
    try {
        const payloadToSave = payload ?? makeSessionSavePayload(session);

        const size = new Blob([payloadToSave.content]).size;
        if (size > MAX_CONTENT_SIZE_BYTES) {
            return {
                success: false,
                reason: PersistFailureReason.CONTENT_TOO_LARGE,
                message: `Session too large: ${(size / 1_048_576).toFixed(2)} MB (max ${(MAX_CONTENT_SIZE_BYTES / 1_048_576).toFixed(1)} MB).`,
            };
        }

        const newId = await new BackendSyncManager(workbench).persist(session, payloadToSave);

        if (newId && !session.getIsPersisted()) {
            session.setId(newId);
            session.setIsPersisted(true);
        }

        return {
            success: true,
            sessionId: session.getId()!,
        };
    } catch (err) {
        console.error("Failed to persist session:", err);
        return {
            success: false,
            reason: PersistFailureReason.ERROR,
        };
    }
}
