import { defineConfig } from "@hey-api/openapi-ts";
import { upperFirst } from "lodash";

import { makePlugin as cacheBustingPlugin } from "./open-api/cachebusting-plugin";

function toPascalCase(str: string): string {
    const camelCase = str
        .replace(/[_-]+/g, " ")
        .split(" ")
        .map((word) => upperFirst(word))
        .join("");

    // PascalCase should just be camelcase with the first letter upper-cased
    return upperFirst(camelCase);
}

function addSuffix(name: string, categoricalSuffix = "", coreSuffix = "_api"): string {
    const pascalCasedName = toPascalCase(name);
    const suffixedName = pascalCasedName + categoricalSuffix + coreSuffix;

    return suffixedName;
}

export default defineConfig({
    input: "http://localhost:5000/openapi.json",
    output: {
        postProcess: ["eslint", "prettier"],
        path: "./src/api/autogen/",
        // (Revert v0.67) Don't append js to relative paths
        tsConfigPath: null,
    },
    parser: {
        hooks: {
            operations: {
                // (Revert v0.82) Generate tanstack query for post methods
                isQuery: (op) => (op.method === "post" ? true : undefined),
            },
        },
        transforms: {
            // (Revert v0.66) Only generate a single payload type
            readWrite: false,
        },
    },
    plugins: [
        cacheBustingPlugin(),
        "@hey-api/sdk",
        { name: "@hey-api/client-axios", exportFromIndex: true },
        {
            name: "@tanstack/react-query",
            exportFromIndex: true,
            "~hooks": {
                operations: {
                    // (Revert v0.82) Generate tanstack query for post methods
                    isQuery: (op) => (op.method === "post" ? true : undefined),
                },
            },
        },
        {
            name: "@hey-api/typescript",
            enums: "typescript",
            // Add `_api` suffix to generated types.
            // ! Casing mode is applied *after* any name additions. Since our _api breaks
            // ! the standard PascalCase convention, we need to manually transform all
            // ! names. It might be possible to handle this via a plugin, but I could not
            // ! figure out how. This works for now...
            case: "preserve", // Stops the generator from changing any casing
            definitions: { name: (name) => addSuffix(name) },
            requests: { name: (name) => addSuffix(name, "Data") },
            responses: {
                name: (name) => addSuffix(name, "Responses"),
                response: (name) => addSuffix(name, "Response"),
            },
            errors: {
                name: (name) => addSuffix(name, "Errors"),
                error: (name) => addSuffix(name, "Error"),
            },
            webhooks: {
                name: (name) => addSuffix(name, "WebHookRequest"),
                payload: (name) => addSuffix(name, "WebhookPayload"),
            },
        },
    ],
});
