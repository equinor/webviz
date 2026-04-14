// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import type { Preview } from "@storybook/react";

import { DarkModeButton } from "../src/framework/internal/components/DarkModeButton";
import { DensityModeToggle } from "../src/framework/internal/components/DensityModeToggle";

import "@fontsource-variable/inter/wght.css";
import "../src/styles/index.css";
import "./preview.css";

const preview: Preview = {
    decorators: [
        (Story) => (
            <>
                <div
                    className="bg-canvas gap-horizontal-sm px-horizontal-2xs py-horizontal-3xs fixed top-1 right-1 flex rounded"
                    style={{
                        position: "fixed",
                        top: "1rem",
                        right: "1rem",
                    }}
                >
                    <DarkModeButton />
                    <DensityModeToggle />
                </div>
                <div className="bg-surface border-neutral-subtle py-horizontal-2xl px-horizontal-xl h-full w-full rounded border">
                    <Story />
                </div>
            </>
        ),
    ],

    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
};

export default preview;
