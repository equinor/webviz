import { describe, expect, test, vi } from "vitest";

import {
    collectFingerprintInput,
    fingerprintResponse,
    SchemaFingerprintError,
} from "../../open-api/schema-fingerprint";

// Loosely typed so that each test can mutate the fixture freely
type Spec = any;

function makeSpec(): Spec {
    return {
        openapi: "3.1.0",
        info: { title: "Fixture", version: "1" },
        paths: {
            "/wells": {
                get: {
                    operationId: "getWells",
                    summary: "Get wells",
                    parameters: [{ name: "field", in: "query", required: true, schema: { type: "string" } }],
                    responses: {
                        "200": {
                            description: "Successful Response",
                            content: {
                                "application/json": {
                                    schema: { type: "array", items: { $ref: "#/components/schemas/Well" } },
                                },
                            },
                        },
                        "422": {
                            description: "Validation Error",
                            content: {
                                "application/json": { schema: { $ref: "#/components/schemas/HTTPValidationError" } },
                            },
                        },
                    },
                },
            },
            "/fields": {
                get: {
                    operationId: "getFields",
                    responses: {
                        "200": {
                            description: "Successful Response",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/Field" } } },
                        },
                    },
                },
            },
        },
        components: {
            schemas: {
                Well: {
                    type: "object",
                    title: "Well",
                    description: "A drilled well",
                    properties: {
                        name: { type: "string", title: "Name" },
                        depth: { type: "number", title: "Depth" },
                        status: { $ref: "#/components/schemas/WellStatus" },
                        location: { $ref: "#/components/schemas/Location" },
                        trajectory: { oneOf: [{ $ref: "#/components/schemas/Location" }, { type: "null" }] },
                    },
                    required: ["name", "depth"],
                },
                Location: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    required: ["x", "y"],
                },
                WellStatus: { type: "string", enum: ["active", "plugged"] },
                Field: {
                    type: "object",
                    properties: { name: { type: "string" } },
                    required: ["name"],
                },
                HTTPValidationError: {
                    type: "object",
                    properties: { detail: { type: "array", items: { type: "string" } } },
                },
            },
        },
    };
}

function hashOf(spec: Spec, path = "/wells"): string {
    return fingerprintResponse(spec.paths[path].get, spec);
}

function hashAfter(mutate: (spec: Spec) => void, path = "/wells"): string {
    const spec = makeSpec();
    mutate(spec);
    return hashOf(spec, path);
}

function renameSchema(spec: Spec, from: string, to: string): void {
    const schemas = spec.components.schemas;
    schemas[to] = schemas[from];
    delete schemas[from];

    const replaced = JSON.stringify(spec).replaceAll(`"#/components/schemas/${from}"`, `"#/components/schemas/${to}"`);
    Object.assign(spec, JSON.parse(replaced));
}

describe("fingerprintResponse", () => {
    test("returns 16 lowercase hex characters", () => {
        expect(hashOf(makeSpec())).toMatch(/^[0-9a-f]{16}$/);
    });

    test("is identical when the same spec is processed twice", () => {
        expect(hashOf(makeSpec())).toBe(hashOf(makeSpec()));
    });

    test("differs between endpoints with different responses", () => {
        const spec = makeSpec();
        expect(hashOf(spec, "/wells")).not.toBe(hashOf(spec, "/fields"));
    });

    test.each<[string, (spec: Spec) => void]>([
        ["a property is added", (spec) => (spec.components.schemas.Well.properties.uwi = { type: "string" })],
        ["a property is removed", (spec) => delete spec.components.schemas.Well.properties.depth],
        ["a property type changes", (spec) => (spec.components.schemas.Well.properties.depth.type = "integer")],
        ["a field becomes required", (spec) => spec.components.schemas.Well.required.push("status")],
        [
            "a nested referenced schema changes",
            (spec) => (spec.components.schemas.Location.properties.z = { type: "number" }),
        ],
        ["enum values change", (spec) => spec.components.schemas.WellStatus.enum.push("drilling")],
        [
            "oneOf alternatives change",
            (spec) => spec.components.schemas.Well.properties.trajectory.oneOf.push({ type: "string" }),
        ],
        [
            "the success status code changes",
            (spec) => {
                const responses = spec.paths["/wells"].get.responses;
                responses["201"] = responses["200"];
                delete responses["200"];
            },
        ],
        [
            // `default` also covers an undeclared 2xx
            "a default response is added",
            (spec) =>
                (spec.paths["/wells"].get.responses.default = {
                    description: "Any other response",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Field" } } },
                }),
        ],
        ["a result version is added", (spec) => (spec.paths["/wells"].get["x-result-version"] = 1)],
        [
            "the media type changes",
            (spec) => {
                const content = spec.paths["/wells"].get.responses["200"].content;
                content["application/x-ndjson"] = content["application/json"];
                delete content["application/json"];
            },
        ],
        // Accepted: these only cost an extra cache miss
        ["a description changes", (spec) => (spec.components.schemas.Well.description = "A well")],
        ["a referenced schema is renamed", (spec) => renameSchema(spec, "Location", "Position")],
    ])("changes when %s", (_, mutate) => {
        expect(hashAfter(mutate)).not.toBe(hashOf(makeSpec()));
    });

    test.each<[string, (spec: Spec) => void]>([
        [
            "object properties are reordered",
            (spec) => {
                const { name, depth, ...rest } = spec.components.schemas.Well.properties;
                spec.components.schemas.Well.properties = { ...rest, depth, name };
            },
        ],
        [
            "an unrelated endpoint's schema changes",
            (spec) => (spec.components.schemas.Field.properties.code = { type: "string" }),
        ],
        [
            "an unrelated component is added",
            (spec) => (spec.components.schemas.Unused = { type: "object", properties: {} }),
        ],
        [
            "a non-2xx response changes",
            (spec) => (spec.components.schemas.HTTPValidationError.properties.extra = { type: "string" }),
        ],
        [
            "the operation's request parameters and summary change",
            (spec) => {
                spec.paths["/wells"].get.summary = "Fetch wells";
                spec.paths["/wells"].get.parameters.push({ name: "limit", in: "query", schema: { type: "integer" } });
            },
        ],
    ])("is unchanged when %s", (_, mutate) => {
        expect(hashAfter(mutate)).toBe(hashOf(makeSpec()));
    });

    describe("result version", () => {
        test("changes the fingerprint when bumped", () => {
            const v1 = hashAfter((spec) => (spec.paths["/wells"].get["x-result-version"] = 1));
            const v2 = hashAfter((spec) => (spec.paths["/wells"].get["x-result-version"] = 2));
            expect(v2).not.toBe(v1);
        });

        test("is left out of the input when absent, so existing fingerprints don't change", () => {
            const spec = makeSpec();
            expect(collectFingerprintInput(spec.paths["/wells"].get, spec)).not.toHaveProperty("resultVersion");
        });

        test("only affects its own endpoint", () => {
            const hash = hashAfter((spec) => (spec.paths["/wells"].get["x-result-version"] = 2), "/fields");
            expect(hash).toBe(hashOf(makeSpec(), "/fields"));
        });

        test.each([0, -1, 1.5, "2", null])("throws on an invalid value (%s)", (value) => {
            const spec = makeSpec();
            spec.paths["/wells"].get["x-result-version"] = value;
            expect(() => hashOf(spec)).toThrow(SchemaFingerprintError);
        });
    });

    describe("recursive schemas", () => {
        function makeRecursiveSpec(): Spec {
            const spec = makeSpec();
            // Self-recursion: Location.parent → Location
            spec.components.schemas.Location.properties.parent = { $ref: "#/components/schemas/Location" };
            // Mutual recursion: Well.field → Field, Field.wells → Well[]
            spec.components.schemas.Well.properties.field = { $ref: "#/components/schemas/Field" };
            spec.components.schemas.Field.properties.wells = {
                type: "array",
                items: { $ref: "#/components/schemas/Well" },
            };
            return spec;
        }

        test("produce a stable fingerprint", () => {
            const hash = hashOf(makeRecursiveSpec());
            expect(hash).toMatch(/^[0-9a-f]{16}$/);
            expect(hashOf(makeRecursiveSpec())).toBe(hash);
        });

        test("still detect a change inside the cycle", () => {
            const spec = makeRecursiveSpec();
            spec.components.schemas.Field.properties.code = { type: "string" };
            expect(hashOf(spec)).not.toBe(hashOf(makeRecursiveSpec()));
        });
    });

    describe("fallbacks", () => {
        test("warns about a success response without a schema, but still fingerprints deterministically", () => {
            const spec = makeSpec();
            spec.paths["/wells"].get.responses["200"].content["application/json"].schema = {};
            const onWarning = vi.fn();

            const hash = fingerprintResponse(spec.paths["/wells"].get, spec, { onWarning });

            expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("200 application/json"));
            expect(fingerprintResponse(spec.paths["/wells"].get, spec)).toBe(hash);
        });

        test("warns when there is no success response", () => {
            const spec = makeSpec();
            delete spec.paths["/wells"].get.responses["200"];
            const onWarning = vi.fn();

            fingerprintResponse(spec.paths["/wells"].get, spec, { onWarning });

            expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("no 2xx or default response"));
        });

        test("does not warn when only a default response is defined", () => {
            const spec = makeSpec();
            const responses = spec.paths["/wells"].get.responses;
            responses.default = responses["200"];
            delete responses["200"];
            const onWarning = vi.fn();

            fingerprintResponse(spec.paths["/wells"].get, spec, { onWarning });

            expect(onWarning).not.toHaveBeenCalled();
        });

        test("follows references from a default response", () => {
            const spec = makeSpec();
            spec.paths["/wells"].get.responses.default = {
                description: "Any other response",
                content: { "application/json": { schema: { $ref: "#/components/schemas/Field" } } },
            };
            const before = hashOf(spec);

            spec.components.schemas.Field.properties.code = { type: "string" };

            expect(hashOf(spec)).not.toBe(before);
        });

        test("does not warn about a success response without a body", () => {
            const spec = makeSpec();
            spec.paths["/wells"].get.responses = { "204": { description: "No Content" } };
            const onWarning = vi.fn();

            fingerprintResponse(spec.paths["/wells"].get, spec, { onWarning });

            expect(onWarning).not.toHaveBeenCalled();
        });

        test("follows response references", () => {
            const spec = makeSpec();
            spec.components.responses = { Wells: spec.paths["/wells"].get.responses["200"] };
            spec.paths["/wells"].get.responses["200"] = { $ref: "#/components/responses/Wells" };
            const before = hashOf(spec);

            spec.components.schemas.Location.properties.z = { type: "number" };

            expect(hashOf(spec)).not.toBe(before);
        });

        test("throws on an unresolvable reference", () => {
            const spec = makeSpec();
            delete spec.components.schemas.Location;
            expect(() => hashOf(spec)).toThrow(SchemaFingerprintError);
        });

        test("throws on a non-local reference", () => {
            const spec = makeSpec();
            spec.components.schemas.Well.properties.location = { $ref: "other.json#/Location" };
            expect(() => hashOf(spec)).toThrow(SchemaFingerprintError);
        });
    });
});
