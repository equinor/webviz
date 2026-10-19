import { objectToJsonString } from "@framework/internal/WorkbenchSession/utils/hash";
import type { Workbench } from "@framework/Workbench";

import type { PrivateWorkbenchSession } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { MAX_CONTENT_SIZE_BYTES } from "../constants";

import { BackendSyncManager } from "./BackendSyncManager";

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

/**
 * Writes the session's current content to the backend. A session that was never persisted is created
 * there, and gets the new id and is marked as persisted.
 */
export async function persistSessionToBackend(
    workbench: Workbench,
    session: PrivateWorkbenchSession,
): Promise<PersistResult> {
    try {
        const contentToSave = objectToJsonString(session.serializeContentState());

        const size = new Blob([contentToSave]).size;
        if (size > MAX_CONTENT_SIZE_BYTES) {
            return {
                success: false,
                reason: PersistFailureReason.CONTENT_TOO_LARGE,
                message: `Session too large: ${(size / 1_048_576).toFixed(2)} MB (max ${(MAX_CONTENT_SIZE_BYTES / 1_048_576).toFixed(1)} MB).`,
            };
        }

        const newId = await new BackendSyncManager(workbench).persist(session, contentToSave);

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
