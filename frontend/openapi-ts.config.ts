import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    client: "@hey-api/client-axios",
    input: "http://localhost:5000/openapi.json",
    output: "./src/api",
    /*
    services: {
        methodNameBuilder: (operation) => {
            return `${operation.name}_api`;
        },
    },
    */
    // plugins: ["@tanstack/react-query"],
});
