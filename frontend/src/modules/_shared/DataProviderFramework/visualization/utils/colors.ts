import { parse } from "culori";

import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";

export function makeColorMapFunctionFromColorScale(
    colorScaleSpec: ColorScaleSpecification | null,
    options?: {
        valueMin: number;
        valueMax: number;
        midPoint?: number;
        unnormalize?: boolean;
    },
): ((value: number) => [number, number, number]) | undefined {
    if (!colorScaleSpec) return undefined;

    const localColorScale = colorScaleSpec.colorScale.clone();

    if (options && !colorScaleSpec.areBoundariesUserDefined) {
        if (options.midPoint === undefined) {
            localColorScale.setRange(options.valueMin, options.valueMax);
        } else {
            localColorScale.setRangeAndMidPoint(options.valueMin, options.valueMax, options.midPoint);
        }
    }

    const valueMin = localColorScale.getMin();
    const valueMax = localColorScale.getMax();

    return (value: number) => {
        const nonNormalizedValue = options?.unnormalize ? value * (valueMax - valueMin) + valueMin : value;

        const interpolatedColor = localColorScale.getColorForValue(nonNormalizedValue);
        const parsed = parse(interpolatedColor);

        if (!parsed || parsed.mode !== "rgb") {
            return [0, 0, 0]; // fallback
        }

        return [parsed.r * 255, parsed.g * 255, parsed.b * 255];
    };
}
