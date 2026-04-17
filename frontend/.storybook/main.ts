import path from "path";
import { fileURLToPath } from "url";

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindPlugin from "@tailwindcss/vite";
import { mergeConfig } from "vite";
import glsl from "vite-plugin-glsl";

import aliases from "../aliases.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
    addons: ["@storybook/addon-docs"],
    stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
    docs: {},
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
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
