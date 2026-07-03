import React from "react";

import { DensityMedium, DensitySmall } from "@mui/icons-material";

import { useUserSettings } from "@framework/internal/providers/UserSettingsProvider";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

export function DensityModeToggle(): React.ReactNode {
    const { settings, setDensity } = useUserSettings();

    const toggleDenseMode = React.useCallback(
        function toggleDenseMode() {
            setDensity(settings.density === "comfortable" ? "spacious" : "comfortable");
        },
        [settings.density, setDensity],
    );

    return (
        <Tooltip content="Toggle density mode">
            <Button variant="ghost" tone="accent" iconOnly onClick={toggleDenseMode}>
                {settings.density === "comfortable" ? <DensitySmall fontSize="inherit" /> : <DensityMedium fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
