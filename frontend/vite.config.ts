import react from "@vitejs/plugin-react";

import path from "path";
import { defineConfig } from "vite";

import aliases from "./aliases.json";

const paths = {
    public: "./public",
    publicHtmlFile: "./index.html",
    root: "./src",
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                app: paths.publicHtmlFile,
            },
        },
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
    server: {
        open: paths.publicHtmlFile,
    },
});
