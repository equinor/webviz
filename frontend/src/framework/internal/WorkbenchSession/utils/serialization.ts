import { Ajv } from "ajv/dist/jtd";

import type { PrivateWorkbenchSession, WorkbenchSessionContent } from "../PrivateWorkbenchSession";
import { workbenchSessionSchema } from "../workbenchSession.jtd";

import { objectToJsonString } from "./hash";
import { sessionIdFromLocalStorageKey } from "./localStorageHelpers";
import { WorkbenchSessionSource, type WorkbenchSessionDataContainer } from "./WorkbenchSessionDataContainer";

export type SerializedWorkbenchSession = {
    content: WorkbenchSessionContent;
};
const ajv = new Ajv();
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
        content: parsed.content,
        id: sessionIdFromLocalStorageKey(key) ?? undefined,
        source: WorkbenchSessionSource.LOCAL_STORAGE,
    };

    return session;
}

export function makeWorkbenchSessionStateString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        content: session.getContent(),
    });
}

export function makeWorkbenchSessionLocalStorageString(session: PrivateWorkbenchSession): string {
    return objectToJsonString({
        content: session.getContent(),
    });
}
