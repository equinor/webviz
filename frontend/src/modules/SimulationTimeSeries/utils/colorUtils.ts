import { formatHex, formatHsl, modeHsl, useMode } from "culori";

/**
    Converts the given hex color to hsl and adjusts the l-channel with the given scale.

    If conversion to hsl fails, the function returns undefined.
 */
export function scaleHexColorLightness(
    hexColor: string,
    scale: number,
    minScale = 0.1,
    maxScale = 1.5
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
