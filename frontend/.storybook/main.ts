import path from "path";
import { fileURLToPath } from "url";

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindPlugin from "@tailwindcss/vite";
import { mergeConfig } from "vite";
import glsl from "vite-plugin-glsl";

import aliases from "../aliases.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bodyClassName = "bg-canvas";

const config: StorybookConfig = {
    stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
    docs: {},
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    // Hacky solution to add tailwind class name to the body tag, so we get the tailwind canvas color for light/dark mode.
    previewBody: (body) => `
        <script>setTimeout(function () { document.body.classList.add("${bodyClassName}"); }, 0);</script>
        ${body}
    `,
    viteFinal: async (config) => {
        return mergeConfig(config, {
            plugins: [
                tailwindPlugin(),
                glsl({
                    include: "**/*.glsl",
                    defaultExtension: "glsl",
                }),
            ],
            resolve: {
                alias: Object.keys(aliases.compilerOptions.paths).reduce<Record<string, string>>((prev, current) => {
                    const key = current as keyof typeof aliases.compilerOptions.paths;
                    return {
                        ...prev,
                        [current.replace("/*", "")]: path.resolve(
                            __dirname,
                            "..",
                            aliases.compilerOptions.paths[key][0].replace("/*", ""),
                        ),
                    };
                }, {}),
            },
            define: {
                "process.env": {},
            },
        });
    },
};

export default config;
