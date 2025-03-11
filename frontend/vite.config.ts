import tailwindPlugin from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

import jotaiDebugLabel from "jotai/babel/plugin-debug-label";
import jotaiReactRefresh from "jotai/babel/plugin-react-refresh";
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
        plugins: [
            tailwindPlugin(),
            react({
                babel: {
                    plugins: [jotaiDebugLabel, jotaiReactRefresh],
                },
            }),
            vitePluginChecker({ typescript: true }),
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
