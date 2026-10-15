import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@hey-api/openapi-ts";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios, { AxiosError, isAxiosError } from "axios";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { fingerprintResponse, makeSchemaFingerprintEvents } from "../../open-api/schema-fingerprint";

// Generated into the frontend folder (not os.tmpdir) so the generated code resolves `axios` from our node_modules.
// `.cache/` is git-ignored.
const OUTPUT_ROOT = path.resolve(import.meta.dirname, "../../.cache");
const BASE_URL = "http://test.local";

function makeSpec(): any {
    const json = (schema: unknown) => ({ description: "OK", content: { "application/json": { schema } } });
    return {
        openapi: "3.1.0",
        info: { title: "Fixture", version: "1" },
        paths: {
            "/wells/{field_id}": {
                get: {
                    operationId: "getWells",
                    "x-browser-cached": true,
                    parameters: [
                        { name: "field_id", in: "path", required: true, schema: { type: "string" } },
                        {
                            name: "names",
                            in: "query",
                            required: true,
                            schema: { type: "array", items: { type: "string" } },
                        },
                        { name: "limit", in: "query", required: false, schema: { type: "integer" } },
                    ],
                    responses: {
                        "200": json({ type: "array", items: { $ref: "#/components/schemas/Well" } }),
                    },
                },
            },
            "/fields": {
                get: {
                    operationId: "getFields",
                    "x-browser-cached": true,
                    responses: { "200": json({ $ref: "#/components/schemas/Field" }) },
                },
            },
            // Not browser-cached
            "/alive": {
                get: { operationId: "getAlive", responses: { "200": json({ type: "string" }) } },
            },
            "/wells": {
                post: {
                    operationId: "createWell",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/Well" } } },
                    },
                    responses: { "200": json({ $ref: "#/components/schemas/Well" }) },
                },
            },
        },
        components: {
            schemas: {
                Well: {
                    type: "object",
                    properties: { name: { type: "string" }, depth: { type: "number" } },
                    required: ["name", "depth"],
                },
                Field: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
            },
        },
    };
}

const generatedDirs: string[] = [];

async function generateSdk(spec: unknown, options: { withFingerprint: boolean }): Promise<string> {
    await mkdir(OUTPUT_ROOT, { recursive: true });
    const outputDir = await mkdtemp(path.join(OUTPUT_ROOT, "schema-fingerprint-sdk-"));
    generatedDirs.push(outputDir);

    // createClient merges this into frontend/openapi-ts.config.ts: objects are merged deeply, arrays (plugins,
    // postProcess) are replaced. Its parser settings therefore apply here too, like in production.
    await createClient({
        input: spec as Record<string, unknown>,
        output: { path: outputDir, tsConfigPath: null, postProcess: [] },
        logs: { level: "silent", file: false },
        plugins: [
            "@hey-api/typescript",
            "@hey-api/client-axios",
            options.withFingerprint
                ? { name: "@hey-api/sdk", $hooks: { events: makeSchemaFingerprintEvents({ onWarning: () => {} }) } }
                : "@hey-api/sdk",
        ],
    });
    return outputDir;
}

type Transport = {
    requests: URL[];
    onRequest: ReturnType<typeof vi.fn>;
    respondWith: (status: number, data: unknown) => void;
};

// Imports a generated SDK and routes its requests through a mocked Axios transport
async function loadSdk(outputDir: string): Promise<{ sdk: any; transport: Transport }> {
    const sdk = await import(path.join(outputDir, "sdk.gen.ts"));
    const { client } = await import(path.join(outputDir, "client.gen.ts"));

    let nextResponse = { status: 200, data: {} as unknown };
    const requests: URL[] = [];

    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
        requests.push(new URL(axios.getUri(config)));
        const response: AxiosResponse = {
            ...nextResponse,
            statusText: String(nextResponse.status),
            headers: {},
            config,
            request: {},
        };
        if (response.status >= 400) {
            throw new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, {}, response);
        }
        return response;
    };

    const instance = axios.create({ adapter });
    const onRequest = vi.fn((config: InternalAxiosRequestConfig) => config);
    instance.interceptors.request.use(onRequest);
    client.setConfig({ baseURL: BASE_URL, axios: instance });

    return {
        sdk,
        transport: {
            requests,
            onRequest,
            respondWith: (status, data) => (nextResponse = { status, data }),
        },
    };
}

// hey-api wraps errors from plugins (JobError → originalError → error)
function collectErrorMessages(error: unknown, depth = 0): string[] {
    if (typeof error !== "object" || error === null || depth > 5) {
        return [];
    }
    const { message, originalError, error: inner, cause } = error as Record<string, unknown>;
    return [String(message ?? ""), ...[originalError, inner, cause].flatMap((e) => collectErrorMessages(e, depth + 1))];
}

function lastRequest(transport: Transport): URL {
    const request = transport.requests.at(-1);
    if (!request) {
        throw new Error("No request was sent");
    }
    return request;
}

describe("generated SDK with schema fingerprints", () => {
    const spec = makeSpec();
    let fingerprintedDir: string;
    let baselineDir: string;
    let changedDir: string;

    beforeAll(async () => {
        fingerprintedDir = await generateSdk(spec, { withFingerprint: true });
        baselineDir = await generateSdk(spec, { withFingerprint: false });

        const changedSpec = makeSpec();
        changedSpec.components.schemas.Well.properties.uwi = { type: "string" };
        changedDir = await generateSdk(changedSpec, { withFingerprint: true });
    }, 60_000);

    afterAll(async () => {
        await Promise.all(generatedDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    });

    test("injects _schema into every browser-cached GET function and nothing else", async () => {
        const source = await readFile(path.join(fingerprintedDir, "sdk.gen.ts"), "utf8");
        const functions = source.split(/^export const /m).slice(1);

        const isCached = (fn: string) => fn.startsWith("getWells ") || fn.startsWith("getFields ");
        const cachedFunctions = functions.filter(isCached);
        const otherFunctions = functions.filter((fn) => !isCached(fn));

        expect(cachedFunctions).toHaveLength(2);
        expect(otherFunctions).toHaveLength(2);
        for (const fn of cachedFunctions) {
            expect(fn).toMatch(/_schema: ["'][0-9a-f]{6}["']/);
        }
        for (const fn of otherFunctions) {
            expect(fn).not.toContain("_schema");
        }
    });

    test("compiles, keeps the public signatures, and does not expose _schema to callers", async () => {
        const usageFile = path.join(fingerprintedDir, "usage.ts");
        await writeFile(
            usageFile,
            [
                `import { createWell, getAlive, getFields, getWells } from "./sdk.gen";`,
                `getWells({ path: { field_id: "f" }, query: { names: ["a"], limit: 1 } });`,
                `getFields();`,
                `getAlive();`,
                `createWell({ body: { name: "w", depth: 1 } });`,
                `// @ts-expect-error _schema is not part of the operation's query type`,
                `getWells({ path: { field_id: "f" }, query: { names: ["a"], _schema: "x" } });`,
            ].join("\n"),
        );

        const program = ts.createProgram([usageFile], {
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
            types: [],
        });
        const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            if (!diagnostic.file || diagnostic.start === undefined) {
                return message;
            }
            const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const source = diagnostic.file.text.split("\n")[line].trim();
            return `${path.basename(diagnostic.file.fileName)}:${line + 1} ${message} | ${source}`;
        });

        expect(diagnostics).toEqual([]);
    }, 60_000);

    test("sends _schema while path and query parameters serialize exactly as without the plugin", async () => {
        const fingerprinted = await loadSdk(fingerprintedDir);
        const baseline = await loadSdk(baselineDir);
        const options = { path: { field_id: "field 1" }, query: { names: ["a", "b"], limit: 5 } };

        await fingerprinted.sdk.getWells(options);
        await baseline.sdk.getWells(options);

        const url = lastRequest(fingerprinted.transport);
        const baselineUrl = lastRequest(baseline.transport);
        const expectedHash = fingerprintResponse(spec.paths["/wells/{field_id}"].get, spec);

        expect(url.searchParams.get("_schema")).toBe(expectedHash);
        url.searchParams.delete("_schema");
        expect(url.href).toBe(baselineUrl.href);
        expect(baselineUrl.pathname).toBe("/wells/field%201");
        expect(baselineUrl.searchParams.getAll("names")).toEqual(["a", "b"]);
    });

    test("sends _schema when the caller passes no options", async () => {
        const { sdk, transport } = await loadSdk(fingerprintedDir);

        await sdk.getFields();

        expect(lastRequest(transport).searchParams.get("_schema")).toMatch(/^[0-9a-f]{6}$/);
    });

    test("leaves GET requests to endpoints that aren't browser-cached unchanged", async () => {
        const { sdk, transport } = await loadSdk(fingerprintedDir);

        await sdk.getAlive();

        expect(lastRequest(transport).search).toBe("");
    });

    test("does not let the caller override _schema", async () => {
        const { sdk, transport } = await loadSdk(fingerprintedDir);

        await sdk.getWells({ path: { field_id: "f" }, query: { names: ["a"], _schema: "stale" } });

        const expectedHash = fingerprintResponse(spec.paths["/wells/{field_id}"].get, spec);
        expect(lastRequest(transport).searchParams.getAll("_schema")).toEqual([expectedHash]);
    });

    test("leaves non-GET requests unchanged", async () => {
        const { sdk, transport } = await loadSdk(fingerprintedDir);

        await sdk.createWell({ body: { name: "w", depth: 1 } });

        expect(lastRequest(transport).search).toBe("");
    });

    test("changes the URL only for endpoints whose response schema changed", async () => {
        const before = await loadSdk(fingerprintedDir);
        const after = await loadSdk(changedDir);
        const options = { path: { field_id: "f" }, query: { names: ["a"] } };

        await before.sdk.getWells(options);
        await after.sdk.getWells(options);
        expect(lastRequest(after.transport).href).not.toBe(lastRequest(before.transport).href);

        await before.sdk.getFields();
        await after.sdk.getFields();
        expect(lastRequest(after.transport).href).toBe(lastRequest(before.transport).href);
    });

    test("refuses to generate when an operation already declares a _schema query parameter", async () => {
        const conflictingSpec = makeSpec();
        conflictingSpec.paths["/fields"].get.parameters = [
            { name: "_schema", in: "query", schema: { type: "string" } },
        ];

        const error = await generateSdk(conflictingSpec, { withFingerprint: true }).catch((e: unknown) => e);

        expect(collectErrorMessages(error).join("\n")).toContain(`already declares a "_schema" query parameter`);
    }, 60_000);

    test("refuses to generate when a non-GET operation is marked as browser-cached", async () => {
        const invalidSpec = makeSpec();
        invalidSpec.paths["/wells"].post["x-browser-cached"] = true;

        const error = await generateSdk(invalidSpec, { withFingerprint: true }).catch((e: unknown) => e);

        expect(collectErrorMessages(error).join("\n")).toContain(
            `"x-browser-cached" is only supported on GET endpoints`,
        );
    }, 60_000);

    test("refuses to generate when x-browser-cached is not true", async () => {
        const invalidSpec = makeSpec();
        invalidSpec.paths["/alive"].get["x-browser-cached"] = "yes";

        const error = await generateSdk(invalidSpec, { withFingerprint: true }).catch((e: unknown) => e);

        expect(collectErrorMessages(error).join("\n")).toContain(`expected "x-browser-cached" to be true, got "yes"`);
    }, 60_000);

    test("keeps interceptors and error handling working", async () => {
        const { sdk, transport } = await loadSdk(fingerprintedDir);
        transport.respondWith(500, { detail: "boom" });

        const result = await sdk.getFields();
        expect(transport.onRequest).toHaveBeenCalledOnce();
        expect(result.error).toEqual({ detail: "boom" });
        expect(result.response.status).toBe(500);

        const thrown = await sdk.getFields({ throwOnError: true }).catch((error: unknown) => error);
        expect(isAxiosError(thrown)).toBe(true);
    });
});
