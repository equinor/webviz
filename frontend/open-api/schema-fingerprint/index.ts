import { fingerprintResponse } from "./fingerprint";
import { makeInjectSchemaQueryEvents, SchemaQueryInjectionError } from "./inject-schema-query";
import type { SdkOperationRef } from "./inject-schema-query";

export {
    collectFingerprintInput,
    fingerprintResponse,
    FINGERPRINT_ALGORITHM,
    SchemaFingerprintError,
} from "./fingerprint";
export { SchemaQueryInjectionError } from "./inject-schema-query";

/** Query parameter carrying the response fingerprint. */
export const SCHEMA_QUERY_KEY = "_schema";

/**
 * Operation field set by the backend on every endpoint decorated with `@cache_time` or `@custom_cache_time`, i.e.
 * every endpoint whose responses browsers may cache.
 */
export const BROWSER_CACHED_FIELD = "x-browser-cached";

export type SchemaFingerprintEventsOptions = {
    /** Defaults to console.warn. */
    onWarning?: (message: string) => void;
};

type OpenApiDocument = { paths?: Record<string, Record<string, unknown> | undefined> };

/**
 * Event hooks for the `@hey-api/sdk` plugin that make every generated request to a browser-cached GET endpoint
 * (`x-browser-cached`) send `_schema=<fingerprint of the operation's 2xx and default responses and its
 * x-result-version>`. A response schema change or a result version bump therefore changes the request URL, so the
 * browser can't serve a body cached before it. See README.md.
 *
 * Usage in openapi-ts.config.ts:
 *
 *     { name: "@hey-api/sdk", $hooks: { events: makeSchemaFingerprintEvents() } }
 */
export function makeSchemaFingerprintEvents(options?: SchemaFingerprintEventsOptions) {
    const warn = options?.onWarning ?? ((message: string) => console.warn(message));

    return makeInjectSchemaQueryEvents({
        queryKey: SCHEMA_QUERY_KEY,
        isEligible: (operation, plugin) => {
            const specOperation = getSpecOperation(operation, plugin.context.spec as OpenApiDocument);
            return isBrowserCached(operation, specOperation);
        },
        resolveValue: (operation, plugin) => {
            const document = plugin.context.spec as OpenApiDocument;
            const specOperation = getSpecOperation(operation, document);

            return fingerprintResponse(specOperation, document, {
                onWarning: (message) =>
                    warn(
                        `[schema-fingerprint] ${operation.method.toUpperCase()} ${operation.path} (${operation.operationId}): ${message}`,
                    ),
            });
        },
    });
}

function getSpecOperation(operation: SdkOperationRef, document: OpenApiDocument): Record<string, unknown> {
    const specOperation = document.paths?.[operation.path]?.[operation.method];
    if (typeof specOperation !== "object" || specOperation === null) {
        throw new SchemaQueryInjectionError(operation, "the operation was not found in the OpenAPI document");
    }
    return specOperation as Record<string, unknown>;
}

function isBrowserCached(operation: SdkOperationRef, specOperation: Record<string, unknown>): boolean {
    const browserCached = specOperation[BROWSER_CACHED_FIELD];
    if (browserCached === undefined) {
        return false;
    }
    if (browserCached !== true) {
        throw new SchemaQueryInjectionError(
            operation,
            `expected "${BROWSER_CACHED_FIELD}" to be true, got ${JSON.stringify(browserCached)}`,
        );
    }
    // Browsers only HTTP-cache GET responses, so a marked non-GET endpoint means the backend's caching setup is wrong
    if (operation.method !== "get") {
        throw new SchemaQueryInjectionError(
            operation,
            `"${BROWSER_CACHED_FIELD}" is only supported on GET endpoints, as browsers don't cache other methods`,
        );
    }
    return true;
}
