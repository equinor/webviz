import { Ajv } from "ajv/dist/jtd";

import { workbenchSessionContentSchema } from "./workbenchSession.jtd";
import type { SerializedWorkbenchSession } from "./WorkbenchSessionSerializer";

const ajv = new Ajv();
const validateFn = ajv.compile<SerializedWorkbenchSession>(workbenchSessionContentSchema);

/**
 * Validates the structure of a workbench session JSON object.
 */
export function validateWorkbenchSessionJson(raw: unknown): raw is SerializedWorkbenchSession {
    return validateFn(raw);
}

/**
 * Returns validation errors if present.
 */
export function getWorkbenchSessionValidationErrors(raw: unknown): string[] | null {
    const isValid = validateFn(raw);
    return isValid ? null : (validateFn.errors ?? []).map((e) => `${e.instancePath || "(root)"} ${e.message}`);
}
