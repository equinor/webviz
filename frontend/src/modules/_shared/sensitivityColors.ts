import type { ColorSet } from "@lib/utils/ColorSet";

export type SensitivityColorMap = { [name: string]: string };

export function createSensitivityColorMap(sensitivityNames: string[], colorSet: ColorSet): SensitivityColorMap {
    const colorMap: SensitivityColorMap = {};
    sensitivityNames.forEach((sensitivityName, index) => {
        colorMap[sensitivityName] = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
    });
    return colorMap;
}
