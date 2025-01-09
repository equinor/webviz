import { defaultPlugins, defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    client: "@hey-api/client-axios",
    input: "http://localhost:5000/openapi.json",
    output: {
        format: "prettier",
        lint: "eslint",
        path: "./src/api",
    },
    experimentalParser: true,
    plugins: [
        ...defaultPlugins,
        "@tanstack/react-query",
        {
            enums: "typescript+namespace",
            name: "@hey-api/typescript",
        },
    ],
});
