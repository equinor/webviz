import { colorTablesObj } from "@emerson-eps/color-tables";
import { ColorScale } from "@lib/utils/ColorScale";

import { Color, Rgb, parse } from "culori";

export function createContinuousColorScaleForMap(colorScale: ColorScale): colorTablesObj[] {
    const hexColors = colorScale.getPlotlyColorScale();
    const rgbArr: [number, number, number, number][] = [];
    hexColors.forEach((hexColor) => {
        const color: Color | undefined = parse(hexColor[1]); // Returns object with r, g, b items for hex strings

        if (color && color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
            const rgbColor = color as Rgb;
            rgbArr.push([hexColor[0], rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255]);
        }
    });

    return [{ name: "Continuous", discrete: false, colors: rgbArr }];
}
