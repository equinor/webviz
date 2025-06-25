import { formatHex, formatHsl, modeHsl, useMode } from "culori";

import type { VectorHexColorMap, VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";

import { SubplotOwner } from "./PlotBuilder";

/**
    Converts the given hex color to hsl and adjusts the l-channel with the given scale.

    If conversion to hsl fails, the function returns undefined.
 */
export function scaleHexColorLightness(
    hexColor: string,
    scale: number,
    minScale = 0.1,
    maxScale = 1.5,
): string | undefined {
    // Convert min and max to scalar 0-1
    const min = Math.max(0.0, minScale);
    const max = Math.min(2.0, maxScale);

    // False positive
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hslColor = useMode(modeHsl);
    const result = hslColor(hexColor);
    if (result) {
        const adjustedHslColor = { ...result, l: Math.min(max, Math.max(min, result.l * scale)) };
        return formatHex(formatHsl(adjustedHslColor)) ?? hexColor;
    }

    return undefined;
}
export function getHexColorFromOwner(
    owner: SubplotOwner,
    vectorSpec: VectorSpec,
    vectorHexColors: VectorHexColorMap,
    traceFallbackColor = "#000000",
): string {
    let color: string | null = null;
    if (owner === SubplotOwner.ENSEMBLE) {
        color = vectorHexColors[vectorSpec.vectorName];
    } else if (owner === SubplotOwner.VECTOR) {
        color = vectorSpec.color;
    }
    return color ?? traceFallbackColor;
}
