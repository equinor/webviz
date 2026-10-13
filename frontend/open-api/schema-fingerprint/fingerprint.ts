import { createHash } from "node:crypto";

import canonicalize from "canonicalize";

/**
 * Mixed into every hash. Bump it whenever what goes into the hash changes, so that all fingerprints change once
 * on purpose rather than by accident.
 */
export const FINGERPRINT_ALGORITHM = "webviz-response-fingerprint/v1";

const FINGERPRINT_LENGTH = 16;

// "200"–"299", OpenAPI's range key "2XX", and "default", which covers every status not declared otherwise,
// including an undeclared 2xx
const SUCCESS_STATUS_CODE = /^(2(\d\d|XX)|default)$/i;

/**
 * Operation field set by the backend's `@cache_time(..., result_version=N)`. It's bumped when an endpoint's returned
 * values change without its response schema changing.
 */
const RESULT_VERSION_FIELD = "x-result-version";

export class SchemaFingerprintError extends Error {
    constructor(message: string) {
        super(`[schema-fingerprint] ${message}`);
        this.name = "SchemaFingerprintError";
    }
}

export type FingerprintOptions = {
    /** Called when the fingerprint can't fully reflect the response body. */
    onWarning?: (message: string) => void;
};

/** Everything the fingerprint is computed from. */
export type FingerprintInput = {
    /** The operation's 2xx and `default` responses, keyed by status code, exactly as in the OpenAPI document. */
    responses: Record<string, unknown>;
    /** Every `$ref` reachable from those responses, mapped to the value it points to. */
    references: Record<string, unknown>;
    /**
     * The operation's `x-result-version`. Only present when the operation has one, so that endpoints without it
     * keep the fingerprint they had before this field existed.
     */
    resultVersion?: number;
};

/**
 * Fingerprint of an OpenAPI operation's success responses (2xx and `default`): their status codes, media types and
 * schemas, plus everything those schemas reference, plus the operation's `x-result-version` if it has one.
 *
 * Any change to that input changes the fingerprint, including descriptions and schema renames. Those only cost
 * an extra cache miss; what matters is that no change to the response shape can keep the old fingerprint.
 *
 * @param operation The operation object from the OpenAPI document (`paths[path][method]`).
 * @param document The whole OpenAPI document, used to resolve `$ref`s.
 * @returns 16 lowercase hex characters.
 */
export function fingerprintResponse(operation: unknown, document: unknown, options?: FingerprintOptions): string {
    const input = collectFingerprintInput(operation, document, options);

    // RFC 8785 canonical JSON: object keys are sorted, so property order in the document doesn't affect the hash
    const canonicalJson = canonicalize(input);
    if (canonicalJson === undefined) {
        throw new SchemaFingerprintError("could not serialize the fingerprint input");
    }

    return sha256Hex(`${FINGERPRINT_ALGORITHM}\n${canonicalJson}`).slice(0, FINGERPRINT_LENGTH);
}

export function collectFingerprintInput(
    operation: unknown,
    document: unknown,
    options?: FingerprintOptions,
): FingerprintInput {
    const warn = options?.onWarning ?? (() => {});

    const successResponses = pickSuccessResponses(operation);
    if (Object.keys(successResponses).length === 0) {
        warn("no 2xx or default response is defined, so the fingerprint can't reflect the response body");
    }
    warnAboutResponsesWithoutSchema(successResponses, document, warn);

    const input: FingerprintInput = {
        responses: successResponses,
        references: collectReachableReferences(successResponses, document),
    };

    const resultVersion = pickResultVersion(operation);
    if (resultVersion !== undefined) {
        input.resultVersion = resultVersion;
    }
    return input;
}

/** Returns the operation's `x-result-version`, or undefined if it has none. */
function pickResultVersion(operation: unknown): number | undefined {
    const resultVersion = isPlainObject(operation) ? operation[RESULT_VERSION_FIELD] : undefined;
    if (resultVersion === undefined) {
        return undefined;
    }
    if (typeof resultVersion !== "number" || !Number.isInteger(resultVersion) || resultVersion <= 0) {
        throw new SchemaFingerprintError(
            `expected "${RESULT_VERSION_FIELD}" to be a positive integer, got ${JSON.stringify(resultVersion)}`,
        );
    }
    return resultVersion;
}

/** Returns the operation's 2xx and `default` responses, keyed by status code. */
function pickSuccessResponses(operation: unknown): Record<string, unknown> {
    if (!isPlainObject(operation)) {
        throw new SchemaFingerprintError("expected an OpenAPI operation object");
    }

    const allResponses = operation.responses ?? {};
    if (!isPlainObject(allResponses)) {
        throw new SchemaFingerprintError("expected the operation's responses to be an object");
    }

    return Object.fromEntries(
        Object.entries(allResponses).filter(([statusCode]) => SUCCESS_STATUS_CODE.test(statusCode)),
    );
}

/**
 * Finds every `$ref` inside `root`, and inside whatever those references point to, and so on. Returns each
 * reference mapped to the value it points to.
 *
 * Collecting references by name, instead of inlining what they point to, means recursive schemas need no special
 * handling: a reference that was already collected isn't followed again.
 */
function collectReachableReferences(root: unknown, document: unknown): Record<string, unknown> {
    const references: Record<string, unknown> = {};
    const nodesToVisit: unknown[] = [root];

    while (nodesToVisit.length > 0) {
        const node = nodesToVisit.shift();

        if (Array.isArray(node)) {
            nodesToVisit.push(...node);
            continue;
        }
        if (!isPlainObject(node)) {
            continue;
        }

        for (const [key, child] of Object.entries(node)) {
            const isReference = key === "$ref" && typeof child === "string";
            if (!isReference) {
                nodesToVisit.push(child);
                continue;
            }

            const alreadyCollected = child in references;
            if (!alreadyCollected) {
                const target = resolveLocalReference(document, child);
                references[child] = target;
                nodesToVisit.push(target);
            }
        }
    }

    return references;
}

/** Warns about response bodies whose schema accepts anything, as their shape can't be fingerprinted. */
function warnAboutResponsesWithoutSchema(
    responses: Record<string, unknown>,
    document: unknown,
    warn: (message: string) => void,
): void {
    for (const [statusCode, response] of Object.entries(responses)) {
        const content = isPlainObject(response) ? resolveIfReference(response, document).content : undefined;
        const hasBody = isPlainObject(content);
        if (!hasBody) {
            // E.g. 204 No Content
            continue;
        }

        for (const [mediaType, mediaTypeObject] of Object.entries(content)) {
            const schema = isPlainObject(mediaTypeObject) ? mediaTypeObject.schema : undefined;
            if (acceptsAnything(schema)) {
                warn(
                    `${statusCode} ${mediaType} has no response schema, so changes to its body can't change the fingerprint`,
                );
            }
        }
    }
}

/** True for a missing schema, `true` or `{}`: they allow any value, so say nothing about the body's shape. */
function acceptsAnything(schema: unknown): boolean {
    return schema === undefined || schema === true || (isPlainObject(schema) && Object.keys(schema).length === 0);
}

/** If `value` is a `{ $ref }` object, returns what it points to; otherwise returns `value` itself. */
function resolveIfReference(value: Record<string, unknown>, document: unknown): Record<string, unknown> {
    if (typeof value.$ref !== "string") {
        return value;
    }
    const target = resolveLocalReference(document, value.$ref);
    return isPlainObject(target) ? target : {};
}

/** Looks up a reference within the document, e.g. "#/components/schemas/Well". */
function resolveLocalReference(document: unknown, ref: string): unknown {
    if (!ref.startsWith("#/")) {
        throw new SchemaFingerprintError(`unsupported $ref "${ref}": only local references ("#/...") are supported`);
    }

    const pathSegments = ref.slice("#/".length).split("/").map(decodeJsonPointerSegment);

    let target = document;
    for (const segment of pathSegments) {
        const canHaveChildren = isPlainObject(target) || Array.isArray(target);
        target = canHaveChildren ? (target as Record<string, unknown>)[segment] : undefined;
        if (target === undefined) {
            throw new SchemaFingerprintError(`unresolvable $ref "${ref}"`);
        }
    }
    return target;
}

// JSON pointer escapes (RFC 6901): "~1" stands for "/" and "~0" for "~". $ref values may also be URL-encoded.
function decodeJsonPointerSegment(segment: string): string {
    return decodeURIComponent(segment).replaceAll("~1", "/").replaceAll("~0", "~");
}

function sha256Hex(text: string): string {
    return createHash("sha256").update(text).digest("hex");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
