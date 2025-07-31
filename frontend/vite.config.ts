import path from "path";

import tailwindPlugin from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import jotaiDebugLabel from "jotai/babel/plugin-debug-label";
import jotaiReactRefresh from "jotai/babel/plugin-react-refresh";
import { defineConfig } from "vite";
import vitePluginChecker from "vite-plugin-checker";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import aliases from "./aliases.json";
import { moduleStatesMapPlugin } from "./vite-plugins/moduleStatesMapPlugin.ts";

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
        plugins: [
            tailwindPlugin(),
            react({
                babel: {
                    plugins: [jotaiDebugLabel, jotaiReactRefresh],
                },
            }),
            vitePluginChecker({ typescript: true }),
            // Polyfill is only needed to solve an import issue in a nested dep in the subsurface-viewer component
            // See webviz-subsurface-components issue #2540 for details.
            nodePolyfills({
                // ! https://security.snyk.io/vuln/SNYK-JS-ELLIPTIC-8187303 Don't allow use of this for now. Nothing
                // ! we' have *is* using it, but I'm excluding it to make it more explicit.
                exclude: ["crypto"],
                globals: { Buffer: true },
            }),
            moduleStatesMapPlugin(),
        ],
        build: {
            rollupOptions: {
                input: {
                    app: paths.publicHtmlFile,
                },
            },
            sourcemap: true,
        },
        define: define,
        resolve: {
            alias: Object.keys(aliases.compilerOptions.paths).reduce(
                (prev, current) => ({
                    ...prev,
                    [current.replace("/*", "")]: path.resolve(
                        __dirname,
                        aliases.compilerOptions.paths[current][0].replace("/*", ""),
                    ),
                }),
                {},
            ),
        },
        server: {
            port: 8080,
            proxy: {
                "/api": {
                    target: "http://backend-primary:5000",
                    rewrite: (path) => path.replace(/^\/api/, ""),
                },
            },
        },
    };
});
