import { fingerprintResponse } from "./fingerprint";
import { makeInjectSchemaQueryEvents, SchemaQueryInjectionError } from "./inject-schema-query";

export {
    collectFingerprintInput,
    fingerprintResponse,
    FINGERPRINT_ALGORITHM,
    SchemaFingerprintError,
} from "./fingerprint";
export { SchemaQueryInjectionError } from "./inject-schema-query";

/** Query parameter carrying the response fingerprint. */
export const SCHEMA_QUERY_KEY = "_schema";

export type SchemaFingerprintEventsOptions = {
    /** Defaults to console.warn. */
    onWarning?: (message: string) => void;
};

/**
 * Event hooks for the `@hey-api/sdk` plugin that make every generated GET request send
 * `_schema=<fingerprint of the operation's success responses>`. A response schema change therefore changes the
 * request URL, so the browser can't serve a body cached under the old schema. See README.md.
 *
 * Usage in openapi-ts.config.ts:
 *
 *     { name: "@hey-api/sdk", $hooks: { events: makeSchemaFingerprintEvents() } }
 */
export function makeSchemaFingerprintEvents(options?: SchemaFingerprintEventsOptions) {
    const warn = options?.onWarning ?? ((message: string) => console.warn(message));

    return makeInjectSchemaQueryEvents({
        queryKey: SCHEMA_QUERY_KEY,
        // Browsers only HTTP-cache GET responses
        methods: ["get"],
        resolveValue: (operation, plugin) => {
            const document = plugin.context.spec as { paths?: Record<string, Record<string, unknown> | undefined> };
            const specOperation = document.paths?.[operation.path]?.[operation.method];
            if (!specOperation) {
                throw new SchemaQueryInjectionError(operation, "the operation was not found in the OpenAPI document");
            }

            return fingerprintResponse(specOperation, document, {
                onWarning: (message) =>
                    warn(
                        `[schema-fingerprint] ${operation.method.toUpperCase()} ${operation.path} (${operation.operationId}): ${message}`,
                    ),
            });
        },
    });
}
