import path from "path";

import fs from "fs";

import babel from "@rolldown/plugin-babel";
import tailwindPlugin from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import jotaiDebugLabel from "jotai-babel/plugin-debug-label";
import jotaiReactRefresh from "jotai-babel/plugin-react-refresh";
import { defineConfig } from "vite";
import vitePluginChecker from "vite-plugin-checker";
import glsl from "vite-plugin-glsl";

import aliases from "./aliases.json";
import { plotlyWebglContextReleasePlugin } from "./vite-plugin-plotly-webgl-context-release.js";

const paths = {
    public: "./public",
    publicHtmlFile: "./index.html",
    root: "./src",
};

const VIRTUAL_TUTORIAL_MEDIA_ID = "virtual:tutorial-media-base-url";
const RESOLVED_VIRTUAL_TUTORIAL_MEDIA_ID = "\0" + VIRTUAL_TUTORIAL_MEDIA_ID;

// Exposes the tutorial media base URL to the app: local public/tutorial-videos when it exists, else "" (Azure).
// A virtual module is used instead of `define`, which rolldown-vite doesn't substitute during dev serve.
function tutorialMediaBaseUrlPlugin() {
    return {
        name: "tutorial-media-base-url",
        resolveId(id: string) {
            return id === VIRTUAL_TUTORIAL_MEDIA_ID ? RESOLVED_VIRTUAL_TUTORIAL_MEDIA_ID : undefined;
        },
        load(id: string) {
            if (id !== RESOLVED_VIRTUAL_TUTORIAL_MEDIA_ID) {
                return undefined;
            }
            const localExists = fs.existsSync(path.resolve(__dirname, "public/tutorial-videos"));
            return `export const TUTORIAL_MEDIA_LOCAL_BASE_URL = ${JSON.stringify(localExists ? "/tutorial-videos" : "")};`;
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
    const define: Record<string, any> = {
        "process.env": {},
        // Subsurface viewer expects this to be polyfilled
        global: "globalThis",
    };

    return {
        plugins: [
            tutorialMediaBaseUrlPlugin(),
            plotlyWebglContextReleasePlugin(),
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
            rolldownOptions: {
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
            fs: {
                allow: [path.resolve(__dirname, "../docs"), path.resolve(__dirname, "./")],
            },
        },
    };
});
