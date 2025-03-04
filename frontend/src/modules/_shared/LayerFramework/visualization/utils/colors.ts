import type { ColorScale } from "@lib/utils/ColorScale";

import type { Rgb } from "culori";
import { parse } from "culori";

export function makeColorMapFunctionFromColorScale(
    colorScale: ColorScale | undefined,
    valueMin: number,
    valueMax: number,
    unnormalize = true,
): ((value: number) => [number, number, number]) | undefined {
    if (!colorScale) {
        return undefined;
    }

    return (value: number) => {
        const nonNormalizedValue = unnormalize ? value * (valueMax - valueMin) + valueMin : value;
        const interpolatedColor = colorScale.getColorForValue(nonNormalizedValue);
        const color = parse(interpolatedColor) as Rgb;
        if (color === undefined) {
            return [0, 0, 0];
        }
        return [color.r * 255, color.g * 255, color.b * 255];
    };
}
