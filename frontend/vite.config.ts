import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import aliases from "./aliases";

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
        alias: aliases,
    },
    server: {
        open: paths.publicHtmlFile,
    },
});
