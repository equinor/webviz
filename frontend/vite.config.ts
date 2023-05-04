import react from "@vitejs/plugin-react";

import path from "path";
import { defineConfig } from "vite";
import vitePluginChecker from "vite-plugin-checker";

import aliases from "./aliases.json";

const paths = {
    public: "./public",
    publicHtmlFile: "./index.html",
    root: "./src",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const define = {
        "process.env": {},
    };

    // In order to polyfill "global" for older packages
    // Only in dev since "@loaders.gl" is already exporting "window" and would cause a duplicate export
    if (mode === "development") {
        define["global"] = "window";
    }

    return {
        plugins: [react(), vitePluginChecker({ typescript: true })],
        build: {
            rollupOptions: {
                input: {
                    app: paths.publicHtmlFile,
                },
            },
        },
        define: define,
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
            port: 8080,
            proxy: {
                "/api": {
                    target: "http://backend:5000",
                    rewrite: (path) => path.replace(/^\/api/, ""),
                },
            },
        },
    };
});
