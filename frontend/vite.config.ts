import path from "path";

import babel from "@rolldown/plugin-babel";
import tailwindPlugin from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import jotaiDebugLabel from "jotai-babel/plugin-debug-label";
import jotaiReactRefresh from "jotai-babel/plugin-react-refresh";
import { defineConfig } from "vite";
import vitePluginChecker from "vite-plugin-checker";
import glsl from "vite-plugin-glsl";

import aliases from "./aliases.json";

const paths = {
    public: "./public",
    publicHtmlFile: "./index.html",
    root: "./src",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
    const define: Record<string, any> = {
        "process.env": {},
    };

    // In order to polyfill "global" for older packages
    // Only in dev since "@loaders.gl" is already exporting "window" and would cause a duplicate export
    if (mode === "development" && command === "serve") {
        define["global"] = "globalThis";
    }

    return {
        plugins: [
            tailwindPlugin(),
            react(),
            vitePluginChecker({ typescript: true }),
            babel({ plugins: [jotaiDebugLabel, jotaiReactRefresh] }),
            glsl({
                include: "**/*.glsl",
                defaultExtension: "glsl",
            }),
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
            alias: [
                ...Object.keys(aliases.compilerOptions.paths).map((current) => ({
                    find: current.replace("/*", ""),
                    replacement: path.resolve(
                        __dirname,
                        aliases.compilerOptions.paths[current as keyof typeof aliases.compilerOptions.paths][0].replace(
                            "/*",
                            "",
                        ),
                    ),
                })),
            ],
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
