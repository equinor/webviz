import React from "react";

import { DarkMode, LightMode } from "@mui/icons-material";

import { getMainDataAttribute, setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";
import { Button } from "@lib/components/Button";

export function DarkModeButton(): React.ReactNode {
    const [colorScheme, setColorScheme] = React.useState<string | null>(getMainDataAttribute("color-scheme"));

    const toggleDarkMode = React.useCallback(function toggleDarkMode() {
        const currentScheme = getMainDataAttribute("color-scheme");
        const newScheme = currentScheme === "dark" ? "light" : "dark";
        setMainDataAttribute("color-scheme", newScheme);
        setColorScheme(newScheme);
    }, []);

    return (
        <Button variant="text" tone="accent" iconOnly onClick={toggleDarkMode}>
            {colorScheme === "dark" ? <DarkMode fontSize="inherit" /> : <LightMode fontSize="inherit" />}
        </Button>
    );
}
