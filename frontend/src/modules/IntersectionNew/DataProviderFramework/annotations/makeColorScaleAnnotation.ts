import type { ColorScale } from "@lib/utils/ColorScale";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { gridColorScaleValues, seismicColorScaleValues } from "../utils.ts/colorScaleUtils";

function makeColorScaleAnnotation({
    getSetting,
    getValueRange,
    id,
    colorScaleValues,
}: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any> & {
    colorScaleValues: (
        valueRange: [number, number],
        colorScale: ColorScale,
    ) => { min: number; max: number; mid: number };
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
        const { min, max, mid } = colorScaleValues(valueRange, colorScale);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, attribute) }];
}

export function makeGridColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        colorScaleValues: (valueRange) => gridColorScaleValues(valueRange),
    });
}

export function makeSeismicColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        colorScaleValues: (valueRange) => seismicColorScaleValues(valueRange),
    });
}
