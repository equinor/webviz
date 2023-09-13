import { colorTablesObj } from "@emerson-eps/color-tables";
import { ColorScale } from "@lib/utils/ColorScale";

import { formatRgb } from "culori";

function rgbStringToArray(rgbString: string): number[] | null {
    const match = rgbString.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
    if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }
    return null;
}
export function createContinuousColorScaleForMap(colorScale: ColorScale): colorTablesObj[] {
    const hexColors = colorScale.getPlotlyColorScale();
    const rgbArr: [number, number, number, number][] = [];
    hexColors.forEach((color) => {
        const rgbString: string = formatRgb(color[1]) as string;
        const rgb = rgbStringToArray(rgbString);
        if (rgb) {
            rgbArr.push([color[0], rgb[0], rgb[1], rgb[2]]);
        }
    });
    return [{ name: "Continuous", discrete: false, colors: rgbArr }];
}
