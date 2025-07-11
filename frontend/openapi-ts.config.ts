import { defaultPlugins, defineConfig } from "@hey-api/openapi-ts";

import { makePlugin as cacheBustingPlugin } from "./open-api/cachebusting-plugin";

export default defineConfig({
    client: "@hey-api/client-axios",
    input: "http://localhost:5000/openapi.json",
    output: {
        format: "prettier",
        lint: "eslint",
        path: "./src/api/autogen/",
    },
    experimentalParser: true,
    plugins: [
        cacheBustingPlugin(),
        ...defaultPlugins,
        "@tanstack/react-query",
        {
            enums: "typescript+namespace",
            name: "@hey-api/typescript",
        },
    ],
});
