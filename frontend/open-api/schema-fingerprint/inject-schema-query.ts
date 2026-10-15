import { $ } from "@hey-api/openapi-ts";
import type { Plugin } from "@hey-api/openapi-ts";

/**
 * Injects a constant query parameter into the request options of generated `@hey-api/sdk` functions:
 *
 *     (options.client ?? client).get({ url: "/wells", ...options, query: { ...options.query, _schema: "<hash>" } })
 *
 * hey-api has no public hook for the request options of an SDK function. We use the public
 * `node:set:before` event, which receives each finished SDK function before it is rendered, and walk
 * into it through hey-api's internal ts-dsl fields to find the request options object.
 *
 * The internal fields are NOT public API. Every step asserts the expected shape and throws, so a hey-api
 * upgrade that changes them fails generation instead of silently dropping the parameter. See README.md.
 */

type SdkEvents = NonNullable<NonNullable<Plugin.Hooks["$hooks"]>["events"]>;
type NodeSetBeforeArgs = Parameters<NonNullable<SdkEvents["node:set:before"]>>[0];
type SdkNode = NonNullable<NodeSetBeforeArgs["node"]>;
type SdkPlugin = NodeSetBeforeArgs["plugin"];

export type SdkOperationRef = {
    operationId: string;
    method: string;
    path: string;
};

export type InjectSchemaQueryOptions = {
    /** Name of the injected query parameter. */
    queryKey: string;
    /** Whether the given operation's SDK function gets the parameter. */
    isEligible: (operation: SdkOperationRef, plugin: SdkPlugin) => boolean;
    /** Returns the constant value to inject for the given operation. */
    resolveValue: (operation: SdkOperationRef, plugin: SdkPlugin) => string;
};

export class SchemaQueryInjectionError extends Error {
    constructor(operation: SdkOperationRef | null, message: string) {
        const where = operation
            ? `${operation.method.toUpperCase()} ${operation.path} (${operation.operationId})`
            : "SDK";
        super(
            `[schema-fingerprint] Cannot inject query parameter into ${where}: ${message}. ` +
                "This usually means a @hey-api/openapi-ts upgrade changed its internal SDK node structure. " +
                "See frontend/open-api/schema-fingerprint/README.md.",
        );
        this.name = "SchemaQueryInjectionError";
    }
}

/**
 * Returns `@hey-api/sdk` event hooks that inject the query parameter, and verify after the SDK plugin has
 * run that every eligible operation received it.
 */
export function makeInjectSchemaQueryEvents(options: InjectSchemaQueryOptions): SdkEvents {
    const injectedOperationIds = new Set<string>();

    return {
        "plugin:handler:before": () => {
            // Generation can run several times in one process (watch mode, tests)
            injectedOperationIds.clear();
        },
        "node:set:before": ({ node, plugin }) => {
            const operation = getSdkOperationRef(node);
            if (!operation || !options.isEligible(operation, plugin)) {
                return;
            }

            const declaredQuery = getDeclaredQueryParameters(operation, plugin);
            if (options.queryKey in declaredQuery) {
                throw new SchemaQueryInjectionError(
                    operation,
                    `the operation already declares a "${options.queryKey}" query parameter`,
                );
            }

            const value = options.resolveValue(operation, plugin);
            injectQueryParameter(node as SdkNode, operation, {
                queryKey: options.queryKey,
                value,
                // Without declared query parameters, `options.query` is typed `never` and can't be spread
                spreadCallerQuery: Object.keys(declaredQuery).length > 0,
            });
            injectedOperationIds.add(operation.operationId);
        },
        "plugin:handler:after": ({ plugin }) => {
            // Guards against the silent failure mode: hey-api no longer passing SDK functions through
            // `node:set:before`, so the hook above never matches anything
            const missing: string[] = [];
            plugin.forEach("operation", (event) => {
                const operation: SdkOperationRef = {
                    operationId: event.operation.id,
                    method: event.method,
                    path: event.path,
                };
                if (options.isEligible(operation, plugin) && !injectedOperationIds.has(operation.operationId)) {
                    missing.push(`${operation.method.toUpperCase()} ${operation.path} (${operation.operationId})`);
                }
            });

            if (missing.length > 0) {
                throw new SchemaQueryInjectionError(
                    null,
                    `${missing.length} eligible operation(s) were never seen by the node:set:before hook: ${missing.join(", ")}`,
                );
            }
        },
    };
}

function getSdkOperationRef(node: SdkNode | null): SdkOperationRef | null {
    if (!node || node["~dsl"] !== "VarTsDsl") {
        return null;
    }

    const meta = node.name.symbol?.meta;
    if (meta?.category !== "sdk" || meta.resource !== "operation") {
        return null;
    }

    // `path` is the IR pointer of the operation: ["paths", <url path>, <method>]
    const pointer = meta.path;
    if (
        typeof meta.resourceId !== "string" ||
        !Array.isArray(pointer) ||
        pointer.length !== 3 ||
        pointer[0] !== "paths" ||
        typeof pointer[1] !== "string" ||
        typeof pointer[2] !== "string"
    ) {
        throw new SchemaQueryInjectionError(null, `unexpected SDK operation symbol meta ${JSON.stringify(meta)}`);
    }

    return { operationId: meta.resourceId, path: pointer[1], method: pointer[2] };
}

// Query parameters as hey-api's IR sees them, i.e. including ones added by earlier plugins (_cacheBust)
function getDeclaredQueryParameters(operation: SdkOperationRef, plugin: SdkPlugin): Record<string, unknown> {
    const irOperation = plugin.context.ir.paths?.[operation.path as `/${string}`]?.[operation.method as "get"] as
        | { parameters?: { query?: Record<string, unknown> } }
        | undefined;

    if (!irOperation) {
        throw new SchemaQueryInjectionError(operation, "the operation was not found in hey-api's IR");
    }
    return irOperation.parameters?.query ?? {};
}

// ---------------------------------------------------------------------------------------------------------
// Internal ts-dsl shapes of @hey-api/openapi-ts 0.99. Only the fields read below are modelled.
//
//   VarTsDsl                  export const getWells = ...
//     .value: FuncTsDsl       <ThrowOnError ...>(options: Options<...>) => ...
//       ._params: ParamTsDsl[]   (name "options", ._optional)
//       ._do: [..., ReturnTsDsl]
//         ._returnExpr: Ref<CallTsDsl>        (options.client ?? client).get<...>(...)
//           ._args: [Ref<ObjectTsDsl>]        { responseType, url, ...options, headers }
//             ._props: Map<key, ObjectPropTsDsl>  keys "prop:<name>" | "spread:<n>"
// ---------------------------------------------------------------------------------------------------------

type DslNode = { "~dsl"?: unknown };
type VarNode = DslNode & { value?: unknown };
type FuncNode = DslNode & { _params?: unknown; _do?: unknown };
type ParamNode = DslNode & { name: { toString(): string }; _optional?: boolean };
type ReturnNode = DslNode & { _returnExpr?: unknown };
type CallNode = DslNode & { _args?: unknown };
type ObjectPropNode = DslNode & { kind: string; _value?: unknown };
type ObjectNode = DslNode & {
    _props?: unknown;
    prop(name: string, expr: ReturnType<typeof $.object>): unknown;
};

type Injection = {
    queryKey: string;
    value: string;
    spreadCallerQuery: boolean;
};

function injectQueryParameter(node: SdkNode, operation: SdkOperationRef, injection: Injection): void {
    const func = expectDsl<FuncNode>((node as VarNode).value, "FuncTsDsl", "the exported const's value", operation);

    const params = expectArray(func._params, "function parameters", operation);
    const optionsParam = params.find(
        (param): param is ParamNode => isDsl(param, "ParamTsDsl") && (param as ParamNode).name.toString() === "options",
    );
    if (!optionsParam) {
        throw new SchemaQueryInjectionError(
            operation,
            `no "options" parameter (paramsStructure "flat" is unsupported)`,
        );
    }

    const statements = expectArray(func._do, "function body", operation);
    const returnStatements = statements.filter((statement) => isDsl(statement, "ReturnTsDsl")) as ReturnNode[];
    if (returnStatements.length !== 1) {
        throw new SchemaQueryInjectionError(operation, `expected 1 return statement, found ${returnStatements.length}`);
    }

    const call = expectDsl<CallNode>(unwrapRef(returnStatements[0]._returnExpr), "CallTsDsl", "the return", operation);
    const callArgs = expectArray(call._args, "client call arguments", operation);
    if (callArgs.length !== 1) {
        throw new SchemaQueryInjectionError(operation, `expected 1 client call argument, found ${callArgs.length}`);
    }

    const requestOptions = expectDsl<ObjectNode>(unwrapRef(callArgs[0]), "ObjectTsDsl", "the client call", operation);
    if (!(requestOptions._props instanceof Map)) {
        throw new SchemaQueryInjectionError(operation, "request options object has no property map");
    }
    const props = requestOptions._props as Map<string, ObjectPropNode>;

    if (!props.has("prop:url")) {
        throw new SchemaQueryInjectionError(operation, `request options have no "url" property`);
    }
    if (props.has("prop:query")) {
        throw new SchemaQueryInjectionError(operation, `request options already have a "query" property`);
    }

    const spreadNames = [...props.values()]
        .filter((prop) => prop.kind === "spread")
        .map((prop) => unwrapRef(prop._value));
    if (!spreadNames.includes("options")) {
        throw new SchemaQueryInjectionError(operation, `request options do not spread "options"`);
    }
    if (spreadNames.includes("params")) {
        throw new SchemaQueryInjectionError(
            operation,
            `request options spread "params" (paramsStructure "flat" is unsupported)`,
        );
    }

    // Added after `...options`, so it overrides any caller-supplied `query` while keeping its entries
    const query = $.object();
    if (injection.spreadCallerQuery) {
        query.spread($("options").attr("query").required(!optionsParam._optional));
    }
    requestOptions.prop("query", query.prop(injection.queryKey, $.literal(injection.value)));
}

function isDsl(value: unknown, dsl: string): boolean {
    return typeof value === "object" && value !== null && (value as DslNode)["~dsl"] === dsl;
}

function expectDsl<T extends DslNode>(value: unknown, dsl: string, where: string, operation: SdkOperationRef): T {
    if (!isDsl(value, dsl)) {
        const found = typeof value === "object" && value !== null ? String((value as DslNode)["~dsl"]) : typeof value;
        throw new SchemaQueryInjectionError(operation, `expected ${dsl} in ${where}, found ${found}`);
    }
    return value as T;
}

function expectArray(value: unknown, where: string, operation: SdkOperationRef): unknown[] {
    if (!Array.isArray(value)) {
        throw new SchemaQueryInjectionError(operation, `expected an array for ${where}`);
    }
    return value;
}

// Mirrors `fromRef` in @hey-api/codegen-core, which wraps most child nodes as { "~ref": node }
function unwrapRef(value: unknown): unknown {
    if (typeof value === "object" && value !== null && "~ref" in value) {
        return (value as { "~ref": unknown })["~ref"];
    }
    return value;
}
