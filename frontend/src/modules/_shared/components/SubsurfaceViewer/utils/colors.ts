import { colorTablesObj } from "@emerson-eps/color-tables";
import {
    defaultContinuousDivergingColorPalettes,
    defaultContinuousSequentialColorPalettes,
} from "@framework/WorkbenchSettings";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { Color, Rgb, parse } from "culori";

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
function createColorScale(colorPalette: ColorPalette): ColorScale {
    const colorScale = new ColorScale({
        type: ColorScaleType.Continuous,
        colorPalette: colorPalette,
        gradientType: ColorScaleGradientType.Sequential,
        steps: 10,
    });
    return colorScale;
}

export function createSubsurfaceMapColorPalettes(): colorTablesObj[] {
    const colorPalettes = [...defaultContinuousSequentialColorPalettes, ...defaultContinuousDivergingColorPalettes];
    const colorTables: colorTablesObj[] = [];
    colorPalettes.forEach((colorPalette) => {
        const colorScale = createColorScale(colorPalette);
        const hexColors = colorScale.getPlotlyColorScale();
        const rgbArr: [number, number, number, number][] = [];
        hexColors.forEach((hexColor, index) => {
            const color: Color | undefined = parse(hexColor[1]); // Returns object with r, g, b items for hex strings

            if (color && "r" in color && "g" in color && "b" in color) {
                const rgbColor = color as Rgb;
                rgbArr.push([index, rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255]);
            }
        });
        colorTables.push({ name: colorPalette.getId(), discrete: true, colors: rgbArr });
    });
    return colorTables;
}
