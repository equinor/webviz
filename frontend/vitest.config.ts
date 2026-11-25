// vitest.config.ts
import path from "path";

import { defineConfig } from "vitest/config";

import aliases from "./aliases.json";

export default defineConfig({
    test: {
        coverage: {
            include: ["src/**/*.ts"],
            provider: "istanbul", // or 'v8'
            reportsDirectory: "./coverage/unit/",
            exclude: ["**/api/**", "**/assets/**", "**/templates/**"],
        },
        include: ["./tests/unit/**/*.test.ts"],
    },
    resolve: {
        // Bare and wildcard aliases of the same name (e.g. "@api" and "@api/*") need separate, anchored matchers
        alias: Object.entries(aliases.compilerOptions.paths).map(([alias, [target]]) => {
            const resolvedTarget = path.resolve(__dirname, target.replace("/*", ""));
            return alias.endsWith("/*")
                ? { find: new RegExp(`^${alias.replace("/*", "")}/`), replacement: `${resolvedTarget}/` }
                : { find: new RegExp(`^${alias}$`), replacement: resolvedTarget };
        }),
    },
});
