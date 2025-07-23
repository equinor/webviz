import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export function makeColorScaleAnnotation({
    getSetting,
    getValueRange,
    id,
    name,
    isLoading,
}: TransformerArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = getValueRange();

    if (!colorScale || !valueRange || isLoading) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const [min, max] = valueRange;
        const mid = min + (max - min) / 2;
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, name) }];
}
