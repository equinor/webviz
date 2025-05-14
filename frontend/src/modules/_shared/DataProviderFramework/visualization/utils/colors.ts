import type { Rgb } from "culori";
import { parse } from "culori";

import type { ColorScale } from "@lib/utils/ColorScale";

export function makeColorMapFunctionFromColorScale(
    colorScale: ColorScale | undefined,
    valueMin: number,
    valueMax: number,
    unnormalize = true,
): ((value: number) => [number, number, number]) | undefined {
    if (!colorScale) {
        return undefined;
    }

    const localColorScale = colorScale.clone();
    localColorScale.setRange(valueMin, valueMax);

    return (value: number) => {
        const nonNormalizedValue = unnormalize ? value * (valueMax - valueMin) + valueMin : value;
        const interpolatedColor = localColorScale.getColorForValue(nonNormalizedValue);
        const color = parse(interpolatedColor) as Rgb;
        if (color === undefined) {
            return [0, 0, 0];
        }
        return [color.r * 255, color.g * 255, color.b * 255];
    };
}
