import React from "react";

import { DarkMode, LightMode } from "@mui/icons-material";

import { setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";
import { Button } from "@lib/newComponents/Button";
import { Tooltip } from "@lib/newComponents/Tooltip";

const LOCAL_STORAGE_KEY = "colorScheme";

function resolveInitialColorScheme(): string {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function DarkModeButton(): React.ReactNode {
    const [colorScheme, setColorScheme] = React.useState<string>(() => resolveInitialColorScheme());

    React.useLayoutEffect(() => {
        setMainDataAttribute("color-scheme", colorScheme);
    }, [colorScheme]);

    const toggleDarkMode = React.useCallback(function toggleDarkMode() {
        const newScheme = colorScheme === "dark" ? "light" : "dark";
        localStorage.setItem(LOCAL_STORAGE_KEY, newScheme);
        setColorScheme(newScheme);
    }, [colorScheme]);

    return (
        <Tooltip content="Toggle dark mode">
            <Button variant="ghost" tone="accent" iconOnly onClick={toggleDarkMode}>
                {colorScheme === "dark" ? <DarkMode fontSize="inherit" /> : <LightMode fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
