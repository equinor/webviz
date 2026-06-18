// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

const portalRoot = document.createElement("div");
portalRoot.id = "portal-root";
document.body.appendChild(portalRoot);

import { ThemeProvider, createTheme } from "@mui/material";
import type { Preview } from "@storybook/react";

import { DarkModeButton } from "../src/framework/internal/components/DarkModeButton";
import { DensityModeToggle } from "../src/framework/internal/components/DensityModeToggle";

// @ts-expect-error -- CSS imports are not typed
import "../src/styles/index.css";
// @ts-expect-error -- CSS imports are not typed
import "./preview.css";

const theme = createTheme({
    components: {
        MuiSvgIcon: {
            defaultProps: {
                fontSize: "inherit",
            },
        },
    },
});

const preview: Preview = {
    tags: ["autodocs"],

    decorators: [
        (Story, ctx) => (
            <>
                {/* TODO: Dark-mode buttons overlap content too much in doc-view. Hide it for now*/}
                {ctx.viewMode !== "docs" && (
                    <div
                        className="bg-canvas gap-horizontal-sm px-2xs py-3xs fixed top-1 right-1 flex rounded"
                        style={{
                            position: "fixed",
                            top: "1rem",
                            right: "1rem",
                        }}
                    >
                        <DarkModeButton />
                        <DensityModeToggle />
                    </div>
                )}
                <div className="bg-surface border-neutral-subtle py-2xl px-xl h-full w-full rounded border">
                    <Story />
                </div>
            </>
        ),
        (Story) => (
            <ThemeProvider theme={theme}>
                <Story />
            </ThemeProvider>
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
