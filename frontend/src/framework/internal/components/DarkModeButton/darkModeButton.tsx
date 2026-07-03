import React from "react";

import { DarkMode, LightMode } from "@mui/icons-material";

import { useUserSettings } from "@framework/internal/providers/UserSettingsProvider";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

export function DarkModeButton(): React.ReactNode {
    const { settings, setColorScheme } = useUserSettings();

    const toggleDarkMode = React.useCallback(
        function toggleDarkMode() {
            setColorScheme(settings.colorScheme === "dark" ? "light" : "dark");
        },
        [settings.colorScheme, setColorScheme],
    );

    return (
        <Tooltip content="Toggle dark mode">
            <Button variant="ghost" tone="accent" iconOnly onClick={toggleDarkMode}>
                {settings.colorScheme === "dark" ? <DarkMode fontSize="inherit" /> : <LightMode fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
