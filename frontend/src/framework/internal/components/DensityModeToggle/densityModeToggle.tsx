import React from "react";

import { DensityMedium, DensitySmall } from "@mui/icons-material";

import { setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";
import { Button } from "@lib/newComponents/Button";
import { Tooltip } from "@lib/components/Tooltip";

const LOCAL_STORAGE_KEY = "density";

function resolveInitialDensity(): string {
    return localStorage.getItem(LOCAL_STORAGE_KEY) ?? "spacious";
}

export function DensityModeToggle(): React.ReactNode {
    const [density, setDensity] = React.useState<string>(() => resolveInitialDensity());

    React.useLayoutEffect(() => {
        setMainDataAttribute("density", density);
    }, [density]);

    const toggleDenseMode = React.useCallback(
        function toggleDenseMode() {
            const newDensity = density === "comfortable" ? "spacious" : "comfortable";
            localStorage.setItem(LOCAL_STORAGE_KEY, newDensity);
            setDensity(newDensity);
        },
        [density],
    );

    return (
        <Tooltip title="Toggle density mode">
            <Button variant="text" tone="accent" iconOnly onClick={toggleDenseMode}>
                {density === "comfortable" ? <DensitySmall fontSize="inherit" /> : <DensityMedium fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
