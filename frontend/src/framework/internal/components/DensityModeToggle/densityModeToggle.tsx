import React from "react";

import { DensityMedium, DensitySmall } from "@mui/icons-material";

import { getMainDataAttribute, setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";
import { Button } from "@lib/newComponents/Button";

export function DensityModeToggle(): React.ReactNode {
    const [density, setDensity] = React.useState<string | null>(getMainDataAttribute("density"));

    const toggleDenseMode = React.useCallback(function toggleDenseMode() {
        const currentDensity = getMainDataAttribute("density");
        const newDensity = currentDensity === "comfortable" ? "spacious" : "comfortable";
        setMainDataAttribute("density", newDensity);
        setDensity(newDensity);
    }, []);

    return (
        <Button variant="text" tone="accent" iconOnly onClick={toggleDenseMode}>
            {density === "comfortable" ? <DensitySmall fontSize="inherit" /> : <DensityMedium fontSize="inherit" />}
        </Button>
    );
}
