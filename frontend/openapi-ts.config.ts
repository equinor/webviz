import { defineConfig } from "@hey-api/openapi-ts";
import { startCase } from "lodash";

import { makePlugin as cacheBustingPlugin } from "./open-api/cachebusting-plugin";

function addSuffix(name: string, categoricalSuffix = "", coreSuffix = "_api"): string {
    const pascalCasedName = startCase(name).replaceAll(" ", "");
    const suffixedName = pascalCasedName + categoricalSuffix + coreSuffix;

    return suffixedName;
}

export default defineConfig({
    input: "http://localhost:5000/openapi.json",
    output: {
        format: "prettier",
        lint: "eslint",
        path: "./src/api/autogen/",
        // (Revert v0.67) Don't append js to relative paths
        tsConfigPath: "off",
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
            enums: { mode: "root" },
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

            // Add `_api` suffix to generated types
            // Because our suffix doesn't follow PascalCasing, we need to manually handle the generated names.
            case: "preserve",
            // ? It might be possible to handle this via a plugin, but I could not figure out how. This works for now...
            definitions: { name: (name) => addSuffix(name) },
            responses: { name: (name) => addSuffix(name, "Response") },
            requests: { name: (name) => addSuffix(name, "Data") },
            errors: { name: (name) => addSuffix(name, "Error") },
            webhooks: { name: (name) => addSuffix(name, "Hook") },
        },
    ],
});
