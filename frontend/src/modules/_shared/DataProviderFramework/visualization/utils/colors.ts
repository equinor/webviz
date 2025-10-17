import type { colorTablesObj } from "@emerson-eps/color-tables";
import { parse, type Color, type Rgb } from "culori";

import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { ColorScale } from "@lib/utils/ColorScale";

export function makeColorMapFunctionFromColorScale(
    colorScaleSpec: ColorScaleSpecification | null,
    options?: {
        valueMin: number;
        valueMax: number;
        midPoint?: number;
        denormalize?: boolean;
        specialColor?: {
            color: string;
            range: [number, number];
        };
    },
): ((value: number) => [number, number, number, number]) | undefined {
    if (!colorScaleSpec) return undefined;

    const localColorScale = colorScaleSpec.colorScale.clone();

    if (options && !colorScaleSpec.areBoundariesUserDefined) {
        let midPoint = options.midPoint;
        if (midPoint === undefined) {
            midPoint = (options.valueMin + options.valueMax) / 2;
        }
        localColorScale.setRangeAndMidPoint(options.valueMin, options.valueMax, midPoint);
    }

    const specialColor = options?.specialColor;
    // Min and max are only used if denormalize is true and when denormalize is true,
    // min and max values must be provided. So, this is just a fallback to avoid any errors.
    const valueMax = options?.valueMax ?? 1;
    const valueMin = options?.valueMin ?? 0;

    return (value: number) => {
        const nonNormalizedValue = options?.denormalize ? value * (valueMax - valueMin) + valueMin : value;
        let interpolatedColor = localColorScale.getColorForValue(nonNormalizedValue);

        if (
            specialColor !== null &&
            specialColor !== undefined &&
            value >= specialColor.range[0] &&
            value <= specialColor.range[1]
        ) {
            interpolatedColor = specialColor.color;
        }

        const parsed = parse(interpolatedColor);

        if (!parsed || parsed.mode !== "rgb") {
            return [0, 0, 0, 1]; // fallback
        }

        return [parsed.r * 255, parsed.g * 255, parsed.b * 255, (parsed.alpha ?? 1) * 255];
    };
}

export function createContinuousColorScaleForMap(colorScale: ColorScale): colorTablesObj[] {
    const hexColors = colorScale.getPlotlyColorScale();
    const rgbArr: [number, number, number, number][] = [];
    hexColors.forEach((hexColor) => {
        const color: Color | undefined = parse(hexColor[1]); // Returns object with r, g, b items for hex strings

        if (color && "r" in color && "g" in color && "b" in color) {
            const rgbColor = color as Rgb;
            rgbArr.push([hexColor[0], rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255]);
        }
    });

    return [{ name: "Continuous", discrete: false, colors: rgbArr }];
}
