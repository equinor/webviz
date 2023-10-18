// vitest.config.ts
import path from "path";
import { defineConfig } from "vitest/config";

import aliases from "./aliases.json";

export default defineConfig({
    test: {
        coverage: {
            include: ["src/**/*"],
            extension: [".ts"],
            provider: "istanbul", // or 'v8'
            reportsDirectory: "./coverage/unit/",
            exclude: ["**/api/**", "**/assets/**", "**/templates/**"],
            all: true,
        },
        include: ["./tests/unit/**/*.test.ts"],
    },
    resolve: {
        alias: Object.keys(aliases.compilerOptions.paths).reduce(
            (prev, current) => ({
                ...prev,
                [current.replace("/*", "")]: path.resolve(
                    __dirname,
                    aliases.compilerOptions.paths[current][0].replace("/*", "")
                ),
            }),
            {}
        ),
    },
});
