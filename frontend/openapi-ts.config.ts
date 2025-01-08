import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    client: "@hey-api/client-axios",
    input: "http://localhost:5000/openapi.json",
    output: "./src/api",
    plugins: ["@tanstack/react-query"],
});
