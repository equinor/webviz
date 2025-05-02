import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { createGridColorScaleValues, createSeismicColorScaleValues } from "../utils.ts/colorScaleUtils";

function makeColorScaleAnnotation({
    getSetting,
    getValueRange,
    id,
    createColorScaleValues,
}: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any> & {
    createColorScaleValues: (valueRange: [number, number]) => { min: number; max: number; mid: number };
}): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = getValueRange();
    const attribute = getSetting(Setting.ATTRIBUTE);

    if (!colorScale || !valueRange || !attribute) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, attribute) }];
}

export function makeGridColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        createColorScaleValues: createGridColorScaleValues,
    });
}

export function makeSeismicColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        createColorScaleValues: createSeismicColorScaleValues,
    });
}
